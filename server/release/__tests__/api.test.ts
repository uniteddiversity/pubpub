/* global describe, it, expect, beforeAll, afterAll, afterEach */
import { setup, teardown, login, modelize, editPub } from 'stubstub';

import { Doc, Export, Release } from 'server/models';
import { getExportFormats } from 'utils/export/formats';

const models = modelize`
	Community community {
		Pub pub {
			Member {
				permissions: "manage"
				User pubManager {}
            }
            Member {
                permissions: "admin"
                User pubAdmin {}
            }
		}
		Pub discussPub {
			Member {
				permissions: "admin"
				User discussPubAdmin {}
			}
		}
	}
	User rando {}
`;

setup(beforeAll, async () => {
	await models.resolve();
});

afterEach(async () => {
	const { pub } = models;
	await Release.destroy({ where: { pubId: pub.id } });
});

teardown(afterAll);

const createReleaseRequest = ({ community, pub, ...rest }) => ({
	communityId: community.id,
	pubId: pub.id,
	noteText: '',
	noteContent: {},
	...rest,
});

describe('/api/releases', () => {
// 	it('refuses to create a Release for non-admins of a Pub', async () => {
// 		const { community, pub, pubManager } = models;
// 		const pubEditor = await editPub(pub.id);
// 		await pubEditor
// 			.transform((tr, schema) => tr.insert(1, schema.text('Release me!')))
// 			.writeChange();
// 		const agent = await login(pubManager);
// 		await agent
// 			.post('/api/releases')
// 			.send(
// 				createReleaseRequest({
// 					community: community,
// 					pub: pub,
// 					historyKey: pubEditor.getKey(),
// 					createExports: false,
// 				}),
// 			)
// 			.expect(403);
// 	});

// 	it('will not create an empty Release for admins of a Pub', async () => {
// 		const { community, pub, pubAdmin } = models;
// 		const agent = await login(pubAdmin);
// 		const pubEditor = await editPub(pub.id);
// 		await pubEditor.clearChanges();
// 		const { body: error } = await agent
// 			.post('/api/releases')
// 			.send(
// 				createReleaseRequest({
// 					community: community,
// 					pub: pub,
// 					historyKey: pubEditor.getKey(),
// 					createExports: false,
// 				}),
// 			)
// 			.expect(400);
// 		expect(error).toEqual('merge-failed');
// 	});

// 	it('will create a Release (and associated exports) for admins of a Pub', async () => {
// 		const { community, pub, pubAdmin } = models;
// 		const pubEditor = await editPub(pub.id);
// 		await pubEditor
// 			.transform((tr, schema) => tr.insert(1, schema.text('Helloooooo')))
// 			.writeChange();
// 		const agent = await login(pubAdmin);
// 		const { body: release } = await agent
// 			.post('/api/releases')
// 			.send(
// 				createReleaseRequest({
// 					community: community,
// 					pub: pub,
// 					historyKey: pubEditor.getKey(),
// 				}),
// 			)
// 			.expect(201);
// 		expect(release.historyKey).toEqual(0);
// 		// Check for a doc with Release contents
// 		const doc = await Doc.findOne({ where: { id: release.docId } });
// 		expect(doc.content).toEqual(pubEditor.getDoc().toJSON());
// 		// Check for exports in the expected formats
// 		const createdExports = await Export.findAll({ where: { pubId: pub.id } });
// 		expect(getExportFormats().every((fmt) => createdExports.some((exp) => exp.format === fmt)));
// 	});

// 	it('will not create duplicate Releases for the same history key of a Pub', async () => {
// 		const { community, pub, pubAdmin } = models;
// 		const agent = await login(pubAdmin);
// 		const pubEditor = await editPub(pub.id);
// 		await pubEditor
// 			.transform((tr, schema) => tr.insert(1, schema.text('Here is exactly one change')))
// 			.writeChange();
// 		const { body: release } = await agent
// 			.post('/api/releases')
// 			.send(
// 				createReleaseRequest({
// 					community: community,
// 					pub: pub,
// 					historyKey: pubEditor.getKey(),
// 				}),
// 			)
// 			.expect(201);
// 		expect(release.historyKey).toEqual(1);
// 		const { body: error } = await agent
// 			.post('/api/releases')
// 			.send(
// 				createReleaseRequest({
// 					community: community,
// 					pub: pub,
// 					historyKey: pubEditor.getKey(),
// 				}),
// 			)
// 			.expect(400);
// 		expect(error).toEqual('duplicate-release');
// 	});

	it('will map discussions made on Pubs forward to future Releases', async () => {
		const { community, discussPub: pub, discussPubAdmin: pubAdmin, rando } = models;
		const pubEditor = await editPub(pub.id);
		await pubEditor
			.transform((tr, schema) => tr.insert(1, schema.text('Add some comments to me!')))
			.writeChange();
		const agent = await login(pubAdmin);
		const { body: release } = await agent
			.post('/api/releases')
			.send(
				createReleaseRequest({
					community: community,
					pub: pub,
					historyKey: pubEditor.getKey(),
				}),
			)
			.expect(201);
		expect(release.historyKey).toEqual(0);
	});
});
