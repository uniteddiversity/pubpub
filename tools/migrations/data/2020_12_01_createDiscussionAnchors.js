/* eslint-disable no-console */
import { Anchor, Branch, Pub, Release, Discussion } from 'server/models';
import { getBranchRef } from 'server/utils/firebaseAdmin';

import { forEach, forEachInstance } from '../util';

export const up = async () => {
	await forEachInstance(Pub, async (pub) => {
		const [branches, releases, discussions] = await Promise.all([
			Branch.findAll({ where: { pubId: pub.id } }),
			Release.findAll({ where: { pubId: pub.id } }),
			Discussion.findAll({
				where: { pubId: pub.id },
				include: [{ model: Anchor, as: 'anchor' }],
			}),
		]);
		await forEach(branches, async (branch) => {
			const branchRef = getBranchRef(pub.id, branch.id);
			const discussionsSnapshot = await branchRef.child('discussions').once('value');
			const discussionsFromFirebase = discussionsSnapshot.val();
		});
	});
};
