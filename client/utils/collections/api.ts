import { apiFetch } from 'client/utils/apiFetch';

const collectionPubsRoot = '/api/collectionPubs';

export const addCollectionPub = ({ pubId, collectionId, communityId }) =>
	apiFetch(collectionPubsRoot, {
		method: 'POST',
		body: JSON.stringify({
			pubId: pubId,
			collectionId: collectionId,
			communityId: communityId,
			moveToTop: true,
		}),
	});

export const updateCollectionPub = ({ communityId, id, update }) =>
	apiFetch(collectionPubsRoot, {
		method: 'PUT',
		body: JSON.stringify({
			...update,
			id: id,
			communityId: communityId,
		}),
	});

export const removeCollectionPub = ({ communityId, id }) =>
	apiFetch(collectionPubsRoot, {
		method: 'DELETE',
		body: JSON.stringify({
			id: id,
			communityId: communityId,
		}),
	});

export const updateCollection = ({ communityId, collectionId, updatedCollection }) =>
	apiFetch('/api/collections', {
		method: 'PUT',
		body: JSON.stringify({
			...updatedCollection,
			id: collectionId,
			communityId: communityId,
		}),
	});

export const deleteCollection = ({ communityId, collectionId }) =>
	apiFetch('/api/collections', {
		method: 'DELETE',
		body: JSON.stringify({
			id: collectionId,
			communityId: communityId,
		}),
	});
