import { Node } from 'prosemirror-model';
import { Mapping, Step } from 'prosemirror-transform';

import { Discussions, DiscussionInfo } from './types';

export const isEmptySelection = (selection: DiscussionInfo['selection']) => {
	if (selection) {
		return selection.anchor === selection.head;
	}
	return true;
};

export const mapDiscussionThroughSteps = (
	discussion: DiscussionInfo,
	fromDoc: Node,
	toDoc: Node,
	steps: Step[],
): DiscussionInfo => {
	const { selection } = discussion;
	if (isEmptySelection(selection) || steps.length === 0) {
		return discussion;
	}
	const { head, anchor } = selection!;
	const mapping = new Mapping(steps.map((step) => step.getMap()));
	const nextHead = mapping.map(head, -1);
	const nextAnchor = mapping.map(anchor, -1);
	return {
		...discussion,
		selection: {
			type: 'text',
			anchor: nextAnchor,
			head: nextHead,
		},
	};
};

export const removeDiscussionsById = (discussions: Discussions, keys: Set<string>) => {
	if (keys.size === 0) {
		return discussions;
	}
	const nextDiscussions: Discussions = {};
	Object.entries(discussions).forEach(([id, discussion]) => {
		if (!keys.has(id)) {
			nextDiscussions[id] = discussion;
		}
	});
	return nextDiscussions;
};

export const flattenOnce = <T>(arr: T[][]): T[] => arr.reduce((a, b) => [...a, ...b], []);