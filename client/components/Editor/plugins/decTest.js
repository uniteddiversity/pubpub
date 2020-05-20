import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const localHighlightsPluginKey = new PluginKey('decTest');

export default () => {
	return new Plugin({
		key: localHighlightsPluginKey,
		state: {
			init: (config, editorState) => {
				return {
					activeDecorationSet: DecorationSet.create(editorState.doc, []),
				};
			},
			apply: (transaction, pluginState, prevEditorState, editorState) => {
				const newDecorations = [];
				editorState.doc.forEach((node, offset) => {
					if (node.type.name === 'heading') {
						console.log(offset, node);
						newDecorations.push(
							Decoration.node(
								offset,
								offset + node.content.size+2,
								// { class: 'cat' },
								{ key: Math.random() },
							),
						);
					}
				});
				console.log(newDecorations);
				// debugger;
				const newdecSet = DecorationSet.create(editorState.doc, newDecorations);
				console.log('newdecSet', newdecSet);
				return {
					activeDecorationSet: newdecSet,
					fish: Math.random(),
				};
			},
		},
		props: {
			decorations: (editorState) => {
				console.log('heres the state', localHighlightsPluginKey.getState(editorState));
				return localHighlightsPluginKey.getState(editorState).activeDecorationSet;
			},
		},
	});
};
