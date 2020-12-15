import { Op } from 'sequelize';
import admin from 'firebase-admin';

import { Release, Branch, Doc, Discussion, DiscussionAnchor, sequelize } from 'server/models';
import {
	mergeFirebaseBranch,
	getLatestKey,
	getBranchDoc,
	getBranchRef,
} from 'server/utils/firebaseAdmin';
import { updateVisibilityForDiscussions } from 'server/discussion/queries';
import { createBranchExports } from 'server/export/queries';
import { createDoc } from 'server/doc/queries';
import { getStepsInChangeRange, getDocFromJson } from 'server/utils/firebase';
import { createUpdatedDiscussionAnchorForNewSteps } from 'server/discussionAnchor/queries';
import { Maybe, Release as ReleaseType, DefinitelyHas } from 'utils/types';

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
	previousRelease: Maybe<DefinitelyHas<ReleaseType, 'doc'>>,
	currentHistoryKey: number,
) => {
	if (previousRelease) {
		const { historyKey: previousHistoryKey } = previousRelease;
		return getStepsInChangeRange(draftRef, previousHistoryKey, currentHistoryKey);
	}
	return [];
};

const createDiscussionAnchorsForRelease = async (
	pubId: string,
	draftBranchId: string,
	previousRelease: Maybe<DefinitelyHas<ReleaseType, 'doc'>>,
	currentHistoryKey: number,
	postgresTransaction: any,
) => {
	const draftRef = getBranchRef(pubId, draftBranchId)!;
	if (previousRelease) {
		const steps = await getStepsSinceLastRelease(draftRef, previousRelease, currentHistoryKey);
		const discussions = await Discussion.findAll({
			where: { pubId: pubId },
			attributes: ['id'],
		});
		const existingAnchors = await DiscussionAnchor.findAll({
			where: {
				discussionId: { [Op.in]: discussions.map((d) => d.id) },
				historyKey: currentHistoryKey,
			},
		});
		await Promise.all(
			existingAnchors.map((anchor) =>
				createUpdatedDiscussionAnchorForNewSteps(
					anchor,
					getDocFromJson(previousRelease.doc.content),
					steps,
					currentHistoryKey,
					postgresTransaction,
				),
			),
		);
	}
};

const createReleaseNew = async ({
	userId,
	pubId,
	historyKey,
	noteContent,
	noteText,
	createExports = true,
}) => {
	const mostRecentRelease = await Release.findOne({
		where: { pubId: pubId },
		order: [['createdAt', 'DESC']],
		include: [{ model: Doc, as: 'doc' }],
	});

	if (mostRecentRelease && mostRecentRelease.historyKey === historyKey) {
		throw new Error('Cannot create a duplicate Release');
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
				historyKey,
				txn,
			),
		]);
		return nextRelease;
	});

	if (createExports) {
		await createBranchExports(pubId, publicBranch.id);
	}

	return release;
};

export const createRelease = async ({
	userId,
	pubId,
	draftKey,
	noteContent,
	noteText,
	makeDraftDiscussionsPublic,
	createExports = true,
}) => {
	const pubBranches = await Branch.findAll({ where: { pubId: pubId } });
	const draftBranch = pubBranches.find((branch) => branch.title === 'draft');
	const publicBranch = pubBranches.find((branch) => branch.title === 'public');

	if (!draftBranch || !publicBranch) {
		throw new Error('Cannot create a release on a Pub without a draft and public branch.');
	}

	if (!draftKey && draftKey !== 0) {
		// eslint-disable-next-line no-param-reassign
		draftKey = await getLatestKey(pubId, draftBranch.id);
	}

	const existingRelease = await Release.findOne({
		where: {
			pubId: pubId,
			sourceBranchId: draftBranch.id,
			sourceBranchKey: draftKey,
		},
	});

	if (existingRelease) {
		throw new Error("Can't make a duplicate release");
	}

	const mergeResult = await mergeFirebaseBranch(
		pubId,
		draftBranch.id,
		publicBranch.id,
		makeDraftDiscussionsPublic,
	);

	if (!mergeResult) {
		throw new Error('Firebase branches were not merged.');
	}

	const { mergeKey, doc } = mergeResult;
	const docModel = await createDoc(doc);

	const newRelease = await Release.create({
		noteContent: noteContent,
		noteText: noteText,
		sourceBranchId: draftBranch.id,
		sourceBranchKey: draftKey,
		historyKey: draftKey,
		branchId: publicBranch.id,
		branchKey: mergeKey,
		userId: userId,
		pubId: pubId,
		docId: docModel.id,
	});

	if (createExports) {
		await createBranchExports(pubId, publicBranch.id);
	}

	if (makeDraftDiscussionsPublic) {
		await updateVisibilityForDiscussions({ pubId: pubId }, { access: 'public' });
	}

	return newRelease.toJSON();
};
