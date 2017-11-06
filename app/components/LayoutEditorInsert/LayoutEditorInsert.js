import React from 'react';
import PropTypes from 'prop-types';
import { Popover, PopoverInteractionKind, Position } from '@blueprintjs/core';

require('./layoutEditorInsert.scss');

const propTypes = {
	insertIndex: PropTypes.number.isRequired,
	onInsert: PropTypes.func.isRequired,
};

const LayoutEditorInsert = function(props) {
	const types = [
		{ title: 'Add Pub List', type: 'pubs'},
		{ title: 'Add Text Block', type: 'text'},
		{ title: 'Add HTML Block', type: 'html'},
	];
	return (
		<div className={'layout-editor-insert pt-callout'}>
			<Popover
				content={
					<div className={'pt-menu'}>
						{types.map((item)=> {
							return (
								<div
									key={`insert-${item.type}`}
									className={'pt-menu-item pt-popover-dismiss'}
									onClick={()=>{ props.onInsert(props.insertIndex, item.type); }}
								>
									{item.title}
								</div>
							);
						})}
					</div>
				}
				interactionKind={PopoverInteractionKind.CLICK}
				position={Position.BOTTOM}
				popoverClassName={'pt-minimal'}
				transitionDuration={-1}
				inheritDarkTheme={false}
			>
				<button className={'pt-button pt-icon-add'}>Add Section</button>
			</Popover>

		</div>
	);
};

LayoutEditorInsert.propTypes = propTypes;
export default LayoutEditorInsert;