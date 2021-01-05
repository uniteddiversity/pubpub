import React, { useEffect, useRef } from 'react';
import { Node, Schema } from 'prosemirror-model';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { keydownHandler } from 'prosemirror-keymap';

import nodeViews from '../views';
import { getPlugins } from '../plugins';
import { collabDocPluginKey } from '../plugins/collaborative';
import { immediatelyDispatchOnChange } from '../plugins/onChange';
import { OnEditFn, PluginLoader, PluginsOptions } from '../types';

type EditorViewOptions = {
	customPlugins: Record<string, null | PluginLoader>;
	pluginsOptions: PluginsOptions;
	initialDocNode: Node;
	isReadOnly: boolean;
	schema: Schema;
	mountRef: React.MutableRefObject<HTMLDivElement | null>;
	onKeyPress?: (view: EditorView, evt: KeyboardEvent) => boolean;
	onScrollToSelection?: (view: EditorView) => boolean;
	onError?: (err: Error) => unknown;
	onEdit?: OnEditFn;
};

const blockSaveKeyHandler = keydownHandler({
	'Mod-s': () => true,
});

const getIsEditable = ({ isReadOnly }: Pick<EditorViewOptions, 'isReadOnly'>) => (
	state: EditorState,
) => {
	const collabState = collabDocPluginKey.getState(state);
	if (collabState && !collabState.isLoaded) {
		return false;
	}
	return !isReadOnly;
};

const getDispatchTransaction = (
	view: EditorView,
	{ onError, onEdit }: Pick<EditorViewOptions, 'onError' | 'onEdit'>,
) => (transaction: Transaction) => {
	try {
		const oldState = view.state;
		const collabState = collabDocPluginKey.getState(oldState);
		const newState = view.state.apply(transaction);
		const transactionHasSteps = transaction.steps.length;
		view.updateState(newState);
		if (onEdit && transaction.docChanged) {
			onEdit(transaction.doc, transaction, newState, oldState);
		}
		if (collabState && transactionHasSteps) {
			collabState.sendCollabChanges(newState);
		}
	} catch (err) {
		console.error('Error applying transaction:', err);
		onError?.(err);
	}
};

const createEditorView = (options: EditorViewOptions) => {
	const {
		initialDocNode,
		schema,
		customPlugins,
		pluginsOptions,
		onKeyPress,
		onScrollToSelection,
		mountRef,
	} = options;

	const state = EditorState.create({
		doc: initialDocNode,
		schema: schema,
		plugins: getPlugins(schema, customPlugins, pluginsOptions),
	});

	const view: EditorView<typeof schema> = new EditorView(
		{ mount: mountRef.current! },
		{
			state: state,
			nodeViews: nodeViews,
			editable: getIsEditable(options),
			handleKeyDown: blockSaveKeyHandler,
			handleKeyPress: onKeyPress,
			handleScrollToSelection: onScrollToSelection,
		},
	);

	// Sometimes the view will call its dispatchTransaction from the constructor, but the
	// function itself references the `view` variable bound above. So we need to set this
	// prop immediately after it's constructed.
	view.setProps({
		dispatchTransaction: getDispatchTransaction(view, options),
	});

	immediatelyDispatchOnChange(view);
	return view;
};

export const useEditorView = (options: EditorViewOptions) => {
	const { onEdit, onError, onKeyPress, onScrollToSelection, isReadOnly } = options;
	const viewRef = useRef<null | EditorView>(null);

	useEffect(() => {
		if (viewRef.current === null) {
			viewRef.current = createEditorView(options);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		viewRef.current?.setProps({
			dispatchTransaction: getDispatchTransaction(viewRef.current, {
				onError: onError,
				onEdit: onEdit,
			}),
		});
	}, [onError, onEdit]);

	useEffect(() => {
		viewRef.current?.setProps({
			handleKeyPress: onKeyPress,
			handleScrollToSelection: onScrollToSelection,
		});
	}, [onKeyPress, onScrollToSelection]);

	useEffect(() => {
		viewRef.current?.setProps({
			editable: getIsEditable({ isReadOnly: isReadOnly }),
		});
	}, [isReadOnly]);
};
