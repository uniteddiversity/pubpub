import React, {PropTypes} from 'react';
import Radium from 'radium';
import {Autocomplete} from '../../containers';
import {PubPreview} from '../../components/ItemPreviews';
import {LoaderIndeterminate} from '../../components';
import {globalStyles} from '../../utils/styleConstants';
// import { Link } from 'react-router';

let styles = {};

const JournalCurate = React.createClass({
	propTypes: {
		journalData: PropTypes.object,
		journalSaving: PropTypes.bool,
		journalSaveHandler: PropTypes.func,
		createCollectionHandler: PropTypes.func,
		createCollectionStatus: PropTypes.string,
	},

	getDefaultProps: function() {
		return {
			journalData: {},
		};
	},

	getInitialState() {
		return {
			newCollectionSlug: '',
		};
	},


	featurePub: function(pubID) {
		return () => {
			const outputFeaturedPubs = this.props.journalData.pubsFeatured.map((pub)=>{ return pub._id; });
			outputFeaturedPubs.push(pubID);

			let outputSubmittedPubs = this.props.journalData.pubsSubmitted.filter((pub)=>{ return pub._id !== pubID; });
			outputSubmittedPubs = outputSubmittedPubs.map((pub)=>{ return pub._id; });

			this.props.journalSaveHandler({
				pubsFeatured: outputFeaturedPubs,
				pubsSubmitted: outputSubmittedPubs,
			});
		};
	},

	renderPubSearchResults: function(results) {
		let totalCount = 0; // This is in the case that we have no results because the users in the list are already added
		const featuredObject = {};
		for (let index = this.props.journalData.pubsFeatured.length; index--; ) {
			featuredObject[this.props.journalData.pubsFeatured[index]._id] = this.props.journalData.pubsFeatured[index];
		}

		return (
			<div style={styles.results}>
				{

					results.map((pub, index)=>{

						if (pub._id in featuredObject) {
							return null;
						}

						totalCount++;
						return (<div key={'featuredPubSearch-' + index} style={styles.result}>

							<div style={styles.resultDetails}>
								<PubPreview 
									pubData={pub} 
									headerFontSize={'16px'}
									textFontSize={'13px'} 
									hideBottomLine={true}/>

							</div>
							
							<div style={styles.action} key={'featuredPubSearchAdd-' + index} onClick={this.featurePub(pub._id)}>feature</div>
						</div>);	
					})
				}
				{results.length === 0 || totalCount === 0
					? <div style={styles.noResults}>No Results</div>
					: null
				}
				
			</div>
		);
	},

	updateNewCollectionSlug: function(evt) {
		this.setState({newCollectionSlug: this.refs.slug.value.replace(/[^\w\s]/gi, '').replace(/ /g, '_').toLowerCase()});
	},

	createNewCollection: function() {
		const newObject = {
			title: this.refs.title.value,
			slug: this.refs.slug.value.replace(/[^\w\s]/gi, '').replace(/ /g, '_').toLowerCase(),
		};
		// console.log(newObject);
		this.props.createCollectionHandler(newObject);
		// grab values, dispatch, listen on nextprops for a complete, on which we redirect to the edit page of that thing
	},

	render: function() {
		return (
			<div style={styles.container}>
				<div style={styles.pubSectionsWrapper}>
					
					{/* Featured Pubs Section */}
					<div style={[styles.pubSectionWrapper, styles.featuredPubWrapper]}>
						<div style={styles.sectionTitle}>Featured Pubs</div>
						<div style={styles.sectionText}>Pubs curated by your journal</div>

						<div style={styles.searchWrapper}>
							<Autocomplete 
								autocompleteKey={'journalPubFeatureAutocomplete'} 
								route={'autocompletePubsAll'} 
								placeholder="Search Pubs to Feature" 
								resultRenderFunction={this.renderPubSearchResults}/>
						</div>
						

						{()=>{
							const length = this.props.journalData.pubsFeatured ? this.props.journalData.pubsFeatured.length : 0;
							if (!length) {
								return <div style={styles.emptyBlock}>No Featured Pubs</div>;
							} 
							const output = [];
							for (let index = length; index--;) {
								output.push(<div key={'featuredPubItem-' + index} style={styles.featuredPubsSection}>
									<PubPreview 
										pubData={this.props.journalData.pubsFeatured[index]} 
										headerFontSize={'16px'}
										textFontSize={'13px'} />
								</div>);
							}
							return output;
						}()}


					</div>

					{/* Submitted Pubs Section */}
					<div style={[styles.pubSectionWrapper]}>
						<div style={styles.sectionTitle}>Submitted Pubs</div>
						<div style={styles.sectionText}>Pubs submitted to your journal for consideration</div>
						<div style={styles.submittedPubsSection}>
							{()=>{
								const length = this.props.journalData.pubsSubmitted ? this.props.journalData.pubsSubmitted.length : 0;
								if (!length) {
									return <div style={styles.emptyBlock}>No Pending Submitted Pubs</div>;
								} 
								const output = [];
								for (let index = length; index--;) {
									output.push(<div key={'submittedPubItem-' + index} style={styles.result}>

												<div style={styles.resultDetails}>
													<PubPreview 
														pubData={this.props.journalData.pubsSubmitted[index]} 
														headerFontSize={'16px'}
														textFontSize={'13px'} 
														hideBottomLine={true}/>

												</div>
												
												<div style={styles.action} key={'submittedPubItemAdd-' + index} onClick={this.featurePub(this.props.journalData.pubsSubmitted[index]._id)}>feature</div>
											</div>);
								}
								return output;
							}()}

						</div>
					
					</div>

				</div>

				<div>
					<h2>Collections</h2>
					<div style={styles.emptyBlock}>No Collections</div>

					<div>Create new collection: Title : slug 'CREATE' (takes you to collection page, where you can edit)</div>
					<h2>Create New Collection</h2>
					
					<div key={'createCollection-title'} style={styles.inputWrapper}>
						<label style={styles.manualFormInputTitle} htmlFor={'title'}>Collection Title</label>
						<input style={styles.manualFormInput} name={'title'} id={'createCollection-title'} ref={'title'} type="text" defaultValue={''}/>
					</div>

					<div key={'createCollection-slug'} style={styles.inputWrapper}>
						<label style={styles.manualFormInputTitle} htmlFor={'slug'}>URL</label>
						<input style={styles.manualFormInput} name={'slug'} id={'createCollection-slug'} ref={'slug'} type="text" onChange={this.updateNewCollectionSlug} value={this.state.newCollectionSlug}/>
						<div style={styles.infoText}>Collection will live at <span style={styles.url}>{typeof(window) !== 'undefined' ? window.location.hostname : ''}/collection/<span style={styles.dark}>{(this.state.newCollectionSlug === '' || this.state.newCollectionSlug === undefined) ? '[URL]' : this.state.newCollectionSlug}</span></span></div>
						
					</div>

					<div style={styles.saveSettings} key={'userSettingsSaveButton'} onClick={this.createNewCollection}>Create</div>

					<div style={styles.loader}>
						<h1>{this.props.journalData.createCollectionStatus}</h1>
						{this.props.createCollectionStatus === 'creating'
							? <LoaderIndeterminate color={globalStyles.sideText}/>
							: null
						}
					</div>

				</div>
				
			</div>
		);
	}
});

export default Radium(JournalCurate);

styles = {
	pubSectionsWrapper: {
		margin: '30px 0px',
		display: 'table',
		tableLayout: 'fixed',
		width: '100%',
	},
	pubSectionWrapper: {
		width: '50%',
		display: 'table-cell',
		'@media screen and (min-resolution: 3dppx), screen and (max-width: 767px)': {
			width: '100%',
			display: 'block',
			marginTop: '80px',
		}
	},
	featuredPubWrapper: {
		// Because we're using table-cell, the border doesn't mess with the 1px width difference
		borderRight: '1px solid #EAEAEA',
		'@media screen and (min-resolution: 3dppx), screen and (max-width: 767px)': {
			marginTop: '20px',
			borderRight: '0px solid #EAEAEA',
		}
	},
	featuredPubsSection: {
		margin: '0px 10px',
	},
	submittedPubsSection: {
		margin: '0px 10px',
	},

	sectionTitle: {
		textAlign: 'center',
		fontSize: 20,
	},
	sectionText: {
		textAlign: 'center',
		fontSize: 16,
		marginBottom: '15px'
	},
	emptyBlock: {
		backgroundColor: '#f6f6f6',
		width: '75%',
		margin: '0px auto',
		height: '85px',
		lineHeight: '85px',
		textAlign: 'center',
		border: '1px solid rgba(0,0,0,0.05)',
		borderRadius: '2px',
	},
	searchWrapper: {
		width: '90%',
		margin: '10px auto',
	},
	results: {
		boxShadow: '0px 0px 2px 2px #D7D7D7',
		width: 'calc(100% - 6px)',
		margin: '0 auto 5px auto',
		backgroundColor: 'white',

	},
	result: {
		padding: '5px 0px',
		// margin: '0px 5px',
		borderBottom: '1px solid #F0F0F0',
		display: 'table',
		tableLayout: 'fixed',
		width: '100%',
	},
	resultDetails: {
		display: 'table-cell',
		width: 'calc(100% - 80px)',
		padding: '5px 5px',
	},
	action: {
		display: 'table-cell',
		fontFamily: 'Courier',
		width: '80px',
		// backgroundColor: 'rgba(200,100,0,0.2)',
		verticalAlign: 'middle',
		userSelect: 'none',
		textAlign: 'center',
		cursor: 'pointer',
		':hover': {
			color: 'black',
		}
	},
	noResults: {
		fontFamily: 'Courier',
		fontSize: '15px',
		height: 30,
		lineHeight: '30px',
		textAlign: 'center',
	},
	searchTitle: {
		fontFamily: globalStyles.headerFont,
		fontSize: 16,
	},
	searchAbstract: {
		fontFamily: 'Lora',
		fontSize: 14,
		paddingLeft: '10px',
	},

	inputWrapper: {
		width: '500px',
		margin: '30px 20px',
		position: 'relative',
		'@media screen and (min-resolution: 3dppx), screen and (max-width: 767px)': {
			width: 'calc(100% - 40px)',
		},
	},
	manualFormInputTitle: {
		fontSize: 20,
		color: '#BBB',
		fontFamily: 'Courier',
	},
	manualFormInput: {
		width: '100%',
		fontFamily: 'Courier',
		borderWidth: '0px 0px 1px 0px',
		borderColor: '#BBB',
		outline: 'none',
		fontSize: 18,
		color: '#555',
	},
	manualFormTextArea: {
		borderWidth: '1px 1px 1px 1px',
		resize: 'vertical',
	},
	saveSettings: {
		fontSize: 20,
		width: '52px',
		padding: '0px 20px',
		marginBottom: 20,
		fontFamily: globalStyles.headerFont,
		cursor: 'pointer',
		':hover': {
			color: 'black',
		}
	},
	loader: {
		position: 'relative',
		top: -50,
		width: '100%',
		height: 1
	},
	infoText: {
		// position: 'absolute',
		// bottom: 0,
		// left: 30,
		color: globalStyles.sideText,
		whiteSpace: 'nowrap',
	},
	dark: {
		color: 'black',
	},
	url: {
		fontFamily: 'Courier',
		fontSize: '15px',
		padding: '0px 5px',
	}
};
