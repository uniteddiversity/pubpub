/* eslint-disable react/no-danger */
import React, { useRef, useEffect, useCallback } from 'react';
import { Checkbox } from '@blueprintjs/core';
import { useDebounce } from 'use-debounce';
import { Node } from 'prosemirror-model';

import { renderLatexString } from 'client/utils/editor';
import { usePubData } from 'client/containers/Pub/pubHooks';
import { NodeLabelMap, ReferenceableNodeType } from 'client/components/Editor/types';

import { ControlsButton, ControlsButtonGroup } from './ControlsButton';
import { ControlsReferenceSettingsLink } from './ControlsReference';

require('./controls.scss');

type Props = {
	onClose: (...args: any[]) => any;
	pendingAttrs: any;
	editorChangeObject: {
		changeNode: (...args: any[]) => any;
		updateNode: (...args: any[]) => any;
		selectedNode: Node & {
			value: string;
			html?: string;
			hideLabel: boolean;
		};
	};
	pubData: any;
};

const getSchemaDefinitionForNodeType = (editorChangeObject, nodeTypeName) => {
	return editorChangeObject.view.state.schema.nodes[nodeTypeName];
};

const ControlsEquation = (props: Props) => {
	const { editorChangeObject, pendingAttrs, onClose, pubData } = props;
	const { changeNode, updateNode, selectedNode } = editorChangeObject;
	const {
		commitChanges,
		hasPendingChanges,
		updateAttrs,
		attrs: { value, html },
	} = pendingAttrs;
	const [debouncedValue] = useDebounce(value, 250);
	const hasMountedRef = useRef(false);
	const toggleLabel = useCallback(
		(e: React.MouseEvent) => updateNode({ hideLabel: (e.target as HTMLInputElement).checked }),
		[updateNode],
	);
	const isBlock = selectedNode.type.name === 'block_equation';
	const { nodeLabels } = usePubData();
	const canHideLabel =
		nodeLabels &&
		(nodeLabels as NodeLabelMap)[selectedNode.type.name as ReferenceableNodeType]?.enabled;

	useEffect(() => {
		// Avoid an initial call to the server's LaTeX renderer on mount
		// We shouldn't need this anyway -- but moreover, it will sometimes produce HTML that is
		// insubstantially different from that given in our Prosemirror schema definitions, making
		// it appear as though there is a user-driven change to the node that needs to be committed
		// or reverted.
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			return;
		}
		renderLatexString(debouncedValue, false, (nextHtml) => {
			updateAttrs({ html: nextHtml });
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedValue, isBlock]);

	const handleUpdate = () => {
		commitChanges();
		onClose();
	};

	const handleChangeNodeType = () => {
		const targetNodeType = isBlock ? 'equation' : 'block_equation';
		const schemaDefinition = getSchemaDefinitionForNodeType(editorChangeObject, targetNodeType);
		commitChanges();
		changeNode(schemaDefinition, { value: value, html: html }, null);
	};

	return (
		<div className="controls-equation-component">
			<div className="section">
				<textarea
					className="latex"
					placeholder="Enter LaTeX"
					value={value}
					onChange={(evt) => updateAttrs({ value: evt.target.value })}
				/>
			</div>
			{html && (
				<div className="section">
					<div className="title">Preview</div>
					<div className="preview" dangerouslySetInnerHTML={{ __html: html }} />
					{isBlock && (
						<Checkbox
							disabled={!canHideLabel}
							onClick={toggleLabel}
							label="Hide label"
							checked={selectedNode?.attrs?.hideLabel}
						>
							{!canHideLabel && (
								<>
									{' '}
									(
									<ControlsReferenceSettingsLink dark small pubData={pubData} />)
								</>
							)}
						</Checkbox>
					)}
					<ControlsButtonGroup>
						<ControlsButton onClick={handleChangeNodeType}>
							Change to {isBlock ? 'inline' : 'block'}
						</ControlsButton>
						<ControlsButton disabled={!hasPendingChanges} onClick={handleUpdate}>
							Update equation
						</ControlsButton>
					</ControlsButtonGroup>
				</div>
			)}
		</div>
	);
};
export default ControlsEquation;
