/*
We need two things:
1. Content that can dynamically render non-canonical values
2. Pathway for props to cause re-render

*/

class FootnoteView {
	constructor(node, view, getPos) {
		console.log('in constructor');
	}

	update(node) {
		console.log('got node', node);
		return false;
	}
}

export default FootnoteView;
