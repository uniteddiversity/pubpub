import { Op } from 'sequelize';
import admin from 'firebase-admin';

import { Release, Branch, Doc, Discussion, DiscussionAnchor, sequelize } from 'server/models';
import { mergeFirebaseBranch, getBranchDoc, getBranchRef } from 'server/utils/firebaseAdmin';
import { createBranchExports } from 'server/export/queries';
import { createDoc } from 'server/doc/queries';
import { getStepsInChangeRange, getDocFromJson } from 'server/utils/firebase';
import { createUpdatedDiscussionAnchorForNewSteps } from 'server/discussionAnchor/queries';
import { Maybe, Release as ReleaseType, DefinitelyHas, Doc as DocType } from 'utils/types';

type ReleaseErrorReason = 'merge-failed' | 'duplicate-release';
export class ReleaseQueryError extends Error {
	// eslint-disable-next-line no-useless-constructor
	constructor(reason: ReleaseErrorReason) {
		super(reason);
	}
}

const getBranchesForPub = async (pubId: string) => {
	const pubBranches = await Branch.findAll({ where: { pubId: pubId } });
	const draftBranch = pubBranches.find((branch) => branch.title === 'draft');
	const publicBranch = pubBranches.find((branch) => branch.title === 'public');
	return { draftBranch: draftBranch, publicBranch: publicBranch };
};

const getPubDraftDoc = async (pubId: string, draftBranchId: string, historyKey: number) => {
	return getBranchDoc(pubId, draftBranchId, historyKey, false, false);
};

const getStepsSinceLastRelease = async (
	draftRef: admin.database.Reference,
	previousRelease: Maybe<ReleaseType>,
	currentHistoryKey: number,
) => {
	if (previousRelease) {
		const { historyKey: previousHistoryKey } = previousRelease;
		return getStepsInChangeRange(draftRef, previousHistoryKey + 1, currentHistoryKey);
	}
	return [];
};

const createDiscussionAnchorsForRelease = async (
	pubId: string,
	draftBranchId: string,
	previousRelease: Maybe<DefinitelyHas<ReleaseType, 'doc'>>,
	currentDocJson: {},
	currentHistoryKey: number,
	postgresTransaction: any,
) => {
	const draftRef = getBranchRef(pubId, draftBranchId)!;
	if (previousRelease) {
		const previousDocHydrated = getDocFromJson(previousRelease.doc.content);
		const currentDocHydrated = getDocFromJson(currentDocJson);
		const steps = await getStepsSinceLastRelease(draftRef, previousRelease, currentHistoryKey);
		const discussions = await Discussion.findAll({
			where: { pubId: pubId },
			attributes: ['id'],
		});
		const existingAnchors = await DiscussionAnchor.findAll({
			where: {
				discussionId: { [Op.in]: discussions.map((d) => d.id) },
				historyKey: previousRelease.historyKey,
			},
		});
		await Promise.all(
			existingAnchors.map((anchor) =>
				createUpdatedDiscussionAnchorForNewSteps(
					anchor,
					previousDocHydrated,
					currentDocHydrated,
					steps,
					currentHistoryKey,
					postgresTransaction,
				),
			),
		);
	}
};

export const createRelease = async ({
	userId,
	pubId,
	historyKey,
	noteContent,
	noteText,
	createExports = true,
}) => {
	const mostRecentRelease = await Release.findOne({
		where: { pubId: pubId },
		order: [['historyKey', 'DESC']],
		include: [{ model: Doc, as: 'doc' }],
	});

	if (mostRecentRelease && mostRecentRelease.historyKey === historyKey) {
		throw new ReleaseQueryError('duplicate-release');
	}

	const { draftBranch, publicBranch } = await getBranchesForPub(pubId);
	const { doc: nextDoc } = await getPubDraftDoc(pubId, draftBranch.id, historyKey);

	const release = await sequelize.transaction(async (txn) => {
		const docModel = await createDoc(nextDoc, txn);
		const [nextRelease] = await Promise.all([
			Release.create(
				{
					noteContent: noteContent,
					noteText: noteText,
					historyKey: historyKey,
					branchId: publicBranch.id,
					userId: userId,
					pubId: pubId,
					docId: docModel.id,
				},
				{ transaction: txn },
			),
			createDiscussionAnchorsForRelease(
				pubId,
				draftBranch.id,
				mostRecentRelease,
				nextDoc,
				historyKey,
				txn,
			),
		]);
		return nextRelease;
	});

	await mergeFirebaseBranch(pubId, draftBranch.id, publicBranch.id);

	if (createExports) {
		await createBranchExports(pubId, publicBranch.id);
	}

	return release.toJSON();
};
