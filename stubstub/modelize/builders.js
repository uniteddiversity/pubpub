import uuid from 'uuid';
import SHA3 from 'crypto-js/sha3';
import encHex from 'crypto-js/enc-hex';

import { createCollectionPub } from 'server/collectionPub/queries';
import { Branch, Community, Member, Pub, Release, User } from 'server/models';
import { createPub } from 'server/pub/queries';
import { createCollection } from 'server/collection/queries';
import { createDoc } from 'server/doc/queries';

const builders = {};

builders.User = async (args = {}) => {
	const uniqueness = uuid.v4();
	const {
		firstName = 'Test',
		lastName = 'Testington',
		email = `testuser-${uniqueness}@email.su`,
		fullName = firstName + ' ' + lastName,
		slug = uniqueness,
		initials = firstName.slice(0, 1).toUpperCase() + lastName.slice(0, 1).toUpperCase(),
		password = 'password123',
	} = args;
	const sha3hashedPassword = SHA3(password).toString(encHex);
	return new Promise((resolve, reject) =>
		User.register(
			{
				firstName: firstName,
				lastName: lastName,
				fullName: fullName,
				email: email,
				slug: slug,
				initials: initials,
				passwordDigest: 'sha512',
			},
			sha3hashedPassword,
			(err, user) => {
				if (err) {
					return reject(err);
				}
				// eslint-disable-next-line no-param-reassign
				user.sha3hashedPassword = sha3hashedPassword;
				return resolve(user);
			},
		),
	);
};

builders.Community = async (args = {}) => {
	const unique = uuid.v4();
	return Community.create({
		title: 'Community ' + unique,
		subdomain: unique,
		navigation: [],
		...args,
	});
};

builders.Pub = async (args) => {
	const { createBranches = true, createPubCreator = true, ...restArgs } = args;
	const pubCreator = createPubCreator && (await builders.User());
	const pub = await createPub(restArgs, pubCreator && pubCreator.id);
	if (createBranches) {
		return Pub.findOne({ where: { id: pub.id }, include: [{ model: Branch, as: 'branches' }] });
	}
	await Branch.destroy({ where: { pubId: pub.id } });
	return pub;
};

builders.Collection = ({ title = 'Collection ' + uuid.v4(), kind = 'issue', ...restArgs }) =>
	createCollection({ title: title, kind: kind, ...restArgs });

builders.Member = async ({ pubId, collectionId, communityId, ...restArgs }) => {
	const getTargetArgs = () => {
		// All of the enclosing scope IDs will be passed in, but we only want to associate a Member
		// with exactly one of a pub, collection, or community -- here, the least powerful scope.
		switch (true) {
			case !!pubId:
				return { pubId: pubId };
			case !!collectionId:
				return { collectionId: collectionId };
			case !!communityId:
				return { communityId: communityId };
			default:
				return {};
		}
	};

	return Member.create({ ...getTargetArgs(), ...restArgs });
};

builders.Release = async (args) => {
	// The Release model requires these, but it doesn't currently associate them, so it's safe
	// to create random UUIDs for testing purposes.
	const {
		userId = uuid.v4(),
		branchId = uuid.v4(),
		historyKey = 0,
		docId = null,
		...restArgs
	} = args;

	let resolvedDocId = docId;
	if (!resolvedDocId) {
		const fakeDoc = await createDoc({});
		resolvedDocId = fakeDoc.id;
	}

	return Release.create({
		userId: userId,
		branchId: branchId,
		historyKey: historyKey,
		docId: resolvedDocId,
		...restArgs,
	});
};

builders.CollectionPub = createCollectionPub;

export { builders };
