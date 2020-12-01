/* global describe, it, expect */

import { buildSchema } from 'client/components/Editor';
import { Fragment, Node, Slice } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { ReplaceStep } from 'prosemirror-transform';
import {
	createOriginalDiscussionAnchor,
	createUpdatedDiscussionAnchorForNewSteps,
} from '../queries';

const schema = buildSchema();
const discussionId = 'fd696f73-a1fc-4ffe-88bd-455736457c05';

const originalDoc = Node.fromJSON(schema, {
	type: 'doc',
	attrs: { meta: {} },
	content: [
		{
			type: 'paragraph',
			attrs: {},
			content: [{ type: 'text', text: 'The quick brown fox jumps over the lazy dog' }],
		},
	],
});

const initialSelection = TextSelection.create(originalDoc, 5, 7).toJSON();
const replaceStep1 = new ReplaceStep(1, 1, new Slice(Fragment.from(schema.text('Hey! ')), 0, 0));
const replaceStep2 = new ReplaceStep(1, 13, Slice.empty);

describe('createUpdatedDiscussionAnchorForNewSteps', () => {
	it('repeatedly updates an anchor for a discussion', async () => {
		const firstAnchor = await createOriginalDiscussionAnchor(
			discussionId,
			1,
			initialSelection,
			'foo',
		);
		expect(firstAnchor).toMatchObject({
			discussionId: discussionId,
			historyKey: 1,
			isOriginal: true,
			selection: { type: 'text', anchor: 5, head: 7 },
			originalText: 'foo',
		});
		// Shift the discussion over a bit
		const secondAnchor = await createUpdatedDiscussionAnchorForNewSteps(
			firstAnchor,
			originalDoc,
			[replaceStep1],
			2,
		);
		expect(secondAnchor).toMatchObject({
			discussionId: discussionId,
			historyKey: 2,
			isOriginal: false,
			selection: { type: 'text', anchor: 10, head: 12 },
			originalText: 'foo',
		});
		expect(secondAnchor.discussionId).toEqual(discussionId);
		expect(secondAnchor.historyKey).toEqual(2);
		expect(secondAnchor.isOriginal).toEqual(false);
		expect(secondAnchor.selection).toEqual({ type: 'text', anchor: 10, head: 12 });
		// Now remove its selection entirely
		const thirdAnchor = await createUpdatedDiscussionAnchorForNewSteps(
			firstAnchor,
			originalDoc,
			[replaceStep2],
			3,
		);
		expect(thirdAnchor).toMatchObject({
			discussionId: discussionId,
			historyKey: 3,
			isOriginal: false,
			selection: null,
			originalText: 'foo',
		});
	});
});
