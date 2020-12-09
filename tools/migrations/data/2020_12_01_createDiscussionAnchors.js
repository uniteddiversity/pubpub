/* eslint-disable no-console */
import { Anchor, Branch, Pub, Release, Discussion } from 'server/models';
import { getBranchRef } from 'server/utils/firebaseAdmin';
import { uncompressSelectionJSON } from 'prosemirror-compress-pubpub';

import { forEach, forEachInstance } from '../util';

const getAnchorDescsFromSingleFirebaseDiscussion = (firebaseDiscussion, isPublicBranch) => {
	if (firebaseDiscussion) {
		const {
			initKey,
			initHead,
			initAnchor,
			currentKey,
			selection: compressedSelection,
		} = firebaseDiscussion;
		const selection = uncompressSelectionJSON(compressedSelection);
		return [
			{
				historyKey: initKey,
				head: initHead,
				anchor: initAnchor,
				isPublicBranch: isPublicBranch,
			},
			{
				historyKey: currentKey,
				head: selection.head,
				anchor: selection.anchor,
				isPublicBranch: isPublicBranch,
			},
		];
	}
	return [];
};
const getAnchorDescsFromFirebaseDiscussions = ({
	discussions,
	firebaseDiscussions,
	isPublicBranch,
}) => {
	return discussions
		.map((discussion) =>
			getAnchorDescsFromSingleFirebaseDiscussion(
				firebaseDiscussions[discussion.id],
				isPublicBranch,
			),
		)
		.reduce((a, b) => [...a, ...b], []);
};

const mapAnchorDescsToDraft = (anchorDescs, releases) => {
	return anchorDescs.map((anchor) => {
		const { isPublicBranch, historyKey } = anchor;
		if (isPublicBranch) {
			const correspondingRelease = releases[Math.min(historyKey, releases.length - 1)];
			const draftKey = correspondingRelease.historyKey;
			return { ...anchor, historyKey: draftKey };
		}
		return anchor;
	});
};

const handlePub = async (pub) => {
	const [branches, releases, discussions] = await Promise.all([
		Branch.findAll({ where: { pubId: pub.id } }),
		Release.findAll({ where: { pubId: pub.id } }),
		Discussion.findAll({
			where: { pubId: pub.id },
			include: [{ model: Anchor, as: 'anchor' }],
		}),
	]);
	const anchorDescs = [];
	const publicBranch = branches.find((br) => br.title === 'public');
	// Retrieve all anchors from Firebase
	await forEach(branches, async (branch) => {
		const branchRef = getBranchRef(pub.id, branch.id);
		const discussionsSnapshot = await branchRef.child('discussions').once('value');
		const firebaseDiscussions = discussionsSnapshot.val();
		const isPublicBranch = branch === publicBranch;
		const branchAnchorDescs = getAnchorDescsFromFirebaseDiscussions({
			discussions: discussions,
			firebaseDiscussions: firebaseDiscussions,
			isPublicBranch: isPublicBranch,
		});
		anchorDescs.push(...branchAnchorDescs);
	});
	// Get all anchors from associated discussion.anchor models
	const anchorModelDescs = discussions
		.map((discussion) => {
			const { anchor } = discussion;
			if (anchor) {
				const { from, to, prefix, suffix, exact, branchId, branchKey } = anchor;
				return {
					anchor: from,
					head: to,
					prefix: prefix,
					suffix: suffix,
					exact: exact,
					isPublicBranch: branchId === publicBranch.id,
					historyKey: branchKey,
				};
			}
			return null;
		})
		.filter((x) => x);
	anchorDescs.push(...anchorModelDescs);
	const draftMappedAnchorDescs = mapAnchorDescsToDraft(anchorDescs, releases);
	console.log(pub.title, draftMappedAnchorDescs);
};

module.exports = async () => {
	await forEachInstance(Pub, handlePub);
};
