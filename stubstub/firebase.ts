import { Reference } from '@firebase/database-types';
import { Node } from 'prosemirror-model';
import { Step, Transform } from 'prosemirror-transform';
import uuid from 'uuid/v4';

import { createFirebaseChange, getFirebaseDoc } from 'client/components/Editor';
import { Branch } from 'server/models';
import { getBranchRef, getDatabaseRef, editorSchema } from 'server/utils/firebaseAdmin';

type EditorSchema = typeof editorSchema;
type TransformFn = (t: Transform<EditorSchema>, s: EditorSchema) => void;

export const editFirebaseDraftByRef = async (ref: Reference, { branchId = 'no-branch' } = {}) => {
	const firebaseDocInfo = await getFirebaseDoc(ref, editorSchema);
	let doc = Node.fromJSON(editorSchema, firebaseDocInfo.doc);
	let currentKey = firebaseDocInfo.key;
	let pendingSteps: Step[] = [];

	const api = {
		transform: (fn: TransformFn) => {
			const tr = new Transform(doc);
			fn(tr, editorSchema);
			doc = tr.doc;
			pendingSteps.push(...tr.steps);
			return api;
		},
		writeChange: async () => {
			const change = createFirebaseChange(pendingSteps, branchId, 'stubstub-firebase');
			await ref.child(`changes/${currentKey + 1}`).set(change);
			++currentKey;
			pendingSteps = [];
		},
		clearChanges: async () => {
			await ref.child(`changes`).remove();
			pendingSteps = [];
			currentKey = -1;
		},
		getDoc: () => {
			return doc;
		},
		getKey: () => {
			return currentKey;
		},
		getRef: () => {
			return ref;
		},
	};

	return api;
};

export const editFirebaseDraft = (refKey: string = uuid()) => {
	return editFirebaseDraftByRef(getDatabaseRef(refKey)!);
};

export const editPub = async (pubId: string) => {
	const draftBranch = await Branch.findOne({ where: { pubId: pubId, title: 'draft' } });
	const branchRef = getBranchRef(pubId, draftBranch.id)!;
	return editFirebaseDraftByRef(branchRef, { branchId: draftBranch.id });
};
