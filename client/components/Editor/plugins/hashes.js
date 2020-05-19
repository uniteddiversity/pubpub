import { Plugin } from 'prosemirror-state';
import { generateHash } from '../utils';
/* This plugin adds an id attribute to each header node. */
/* This id can be used for in-page routing. */

const inPasteRange = (offset, transactions) => {
	return transactions.some((trans) => {
		if (trans.meta.paste) {
			const pasteStart = trans.steps[0].from;
			const pasteEnd = trans.steps[0].from + trans.steps[0].slice.content.size;
			return offset >= pasteStart && offset < pasteEnd;
		}
		return false;
	});
};

export default () => {
	return new Plugin({
		appendTransaction: (transactions, oldState, newState) => {
			const transaction = newState.tr;
			let changedId = false;
			const seenHashes = {};
			const maybeChange = {};
			newState.doc.forEach((node, offset) => {
				if (node.attrs.id) {
					if (!inPasteRange(offset, transactions) && seenHashes[node.attrs.id] === true) {
						/* If it's not in pasted range and we've seen the hash, that means it's */
						/* a duplicate from before the time of unique IDs. Change the id. */
						changedId = true;
						transaction.setNodeMarkup(offset, node.type, {
							...node.attrs,
							id: generateHash(6),
						});
					} else if (!inPasteRange(offset, transactions) && !seenHashes[node.attrs.id]) {
						/* If it's not in the pasted range and we haven't seen the hash */
						/* register the hash with seenHashes, and change the ID of any existing */
						/* maybeChange nodes we've registered */
						seenHashes[node.attrs.id] = true;
						if (maybeChange[node.attrs.id]) {
							const newChange = maybeChange[node.attrs.id];
							changedId = true;
							transaction.setNodeMarkup(
								newChange.offset,
								newChange.type,
								newChange.attrs,
							);
						}
					} else if (seenHashes[node.attrs.id]) {
						/* If it is in the pasted range and we've seen the hash, */
						/* we need to change the hash of the pasted item */
						changedId = true;
						transaction.setNodeMarkup(offset, node.type, {
							...node.attrs,
							id: generateHash(6),
						});
					} else {
						/* If it is in the pasted range, but we haven't seen the hash */
						/* we need to register the values with maybeChange in case we do */
						/* see the hash later on. This will occur if we copy a node and then */
						/* paste it above the source location. */
						maybeChange[node.attrs.id] = {
							offset: offset,
							type: node.type,
							attrs: {
								...node.attrs,
								id: generateHash(6),
							},
						};
					}
				} else if (node.type.spec.attrs.id) {
					/* If it doesn't have an ID, assign one as long as its */
					/* schema supports id fields */
					changedId = true;
					transaction.setNodeMarkup(offset, node.type, {
						...node.attrs,
						id: generateHash(6),
					});
				}
			});

			return changedId ? transaction : null;
		},
	});
};
