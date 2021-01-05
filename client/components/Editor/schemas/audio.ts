import { DOMOutputSpec } from 'prosemirror-model';
import { pruneFalsyValues } from 'utils/arrays';
import { withValue } from 'utils/fp';

import { buildLabel } from '../utils/references';
import { renderHtmlChildren } from '../utils/renderHtml';
import { counter } from './reactive/counter';
import { label } from './reactive/label';

export default {
	audio: {
		atom: true,
		reactive: true,
		attrs: {
			id: { default: null },
			url: { default: null },
			size: { default: 50 }, // number as percentage
			align: { default: 'center' },
			caption: { default: '' },
			hideLabel: { default: false },
		},
		reactiveAttrs: {
			count: counter({ useNodeLabels: true }),
			label: label(),
		},
		parseDOM: [
			{
				tag: 'figure',
				getAttrs: (node) => {
					if (node.getAttribute('data-node-type') !== 'audio') {
						return false;
					}
					return {
						id: node.getAttribute('id') || null,
						url: node.firstChild.getAttribute('src') || null,
						size: Number(node.getAttribute('data-size')) || 50,
						align: node.getAttribute('data-align') || 'center',
						caption: node.firstChild.getAttribute('alt') || '',
					};
				},
			},
		],
		toDOM: (node, { isReact } = { isReact: false }) => {
			const figcaptionId = `${node.attrs.id}-figure-caption`;
			return [
				'figure',
				{
					...(node.attrs.id && { id: node.attrs.id }),
					'data-node-type': 'audio',
					'data-size': node.attrs.size,
					'data-align': node.attrs.align,
				},
				[
					'audio',
					{
						controls: 'true',
						preload: 'metadata',
						src: node.attrs.url,
						alt: node.attrs.caption,
						'aria-describedby': figcaptionId,
					},
				],
				[
					'figcaption',
					{ id: figcaptionId },
					pruneFalsyValues([
						'div',
						{},
						withValue(buildLabel(node), (builtLabel) => [
							'strong',
							{ spellcheck: 'false' },
							builtLabel,
						]),
						renderHtmlChildren(isReact, node.attrs.caption, 'div'),
					]),
				],
			] as DOMOutputSpec;
		},
		inline: false,
		group: 'block',

		/* These are not part of the standard Prosemirror Schema spec */
		onInsert: (view, attrs) => {
			const audioNode = view.state.schema.nodes.audio.create(attrs);
			const transaction = view.state.tr.replaceSelectionWith(audioNode);
			view.dispatch(transaction);
		},
		defaultOptions: {},
	},
};
