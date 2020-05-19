/*
We need two things:
1. Content that can dynamically render non-canonical values
2. Pathway for props to cause re-render

*/

class FootnoteView {
	constructor(node, view, getPos) {
		console.log('in constructor');
		// We'll need these later
		this.node = node;
		this.outerView = view;
		this.getPos = getPos;

		// The node's representation in the editor (empty, for now)
		// this.dom = document.createElement('table');
		// These are used when the footnote is selected
		this.innerView = null;
	}

	update(node) {
		console.log('got node', node);
		return true;
	}

	destroy() {
		if (this.innerView) this.close();
	}

	stopEvent(event) {
		return this.innerView && this.innerView.dom.contains(event.target);
	}

	ignoreMutation() {
		return true;
	}
}

export default FootnoteView;
