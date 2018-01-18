import React from 'react';
import PropTypes from 'prop-types';
import dateFormat from 'dateformat';
import { getResizedUrl } from 'utilities';

require('./pubPresHeader.scss');

const propTypes = {
	pubData: PropTypes.object.isRequired,
	setOverlayPanel: PropTypes.func.isRequired,
};

const PubPresHeader = function(props) {
	const pubData = props.pubData;
	const authors = pubData.collaborators.filter((collaborator)=> {
		return collaborator.Collaborator.isAuthor;
	});
	const useHeaderImage = pubData.useHeaderImage && pubData.avatar;
	const backgroundStyle = {};
	if (useHeaderImage) {
		const resizedBackground = getResizedUrl(pubData.avatar, 'fit-in', '1500x600');
		backgroundStyle.backgroundImage = `url("${resizedBackground}")`;
		backgroundStyle.color = 'white';
	}

	return (
		<div className="pub-pres-header-component" style={backgroundStyle}>
			<div className={`wrapper ${useHeaderImage ? 'dim' : ''}`}>
				<div className="container pub">
					<div className="row">
						<div className="col-12">
							<div className="tags-buttons-wrapper">
								<div className="tags">
									{pubData.collections.sort((foo, bar)=> {
										if (foo.title.toLowerCase() < bar.title.toLowerCase()) { return -1; }
										if (foo.title.toLowerCase() > bar.title.toLowerCase()) { return 1; }
										return 0;
									}).map((item)=> {
										return <a key={`footer-collection-${item.id}`} href={`/${item.slug}`} className="pt-tag pt-intent-primary pt-minimal">{item.title}</a>;
									})}
								</div>
								<div className="buttons">
									<div className="pt-button-group pt-minimal">
										<a href={`/pub/${pubData.slug}/collaborate`} className="pt-button">Edit Pub</a>
										{/* <a href="/" className="pt-button">Invite Reviewer</a> */}
										{/* <a href="/" className="pt-button">More</a> */}
									</div>
								</div>
							</div>

							<h1>{pubData.title}</h1>
							{pubData.description &&
								<div className="description">{pubData.description}</div>
							}

							{!!authors.length &&
								<div className="authors">
									<span>by </span>
									{authors.sort((foo, bar)=> {
										if (foo.Collaborator.order < bar.Collaborator.order) { return -1; }
										if (foo.Collaborator.order > bar.Collaborator.order) { return 1; }
										if (foo.Collaborator.createdAt < bar.Collaborator.createdAt) { return 1; }
										if (foo.Collaborator.createdAt > bar.Collaborator.createdAt) { return -1; }
										return 0;
									}).map((author, index)=> {
										const separator = index === authors.length - 1 || authors.length === 2 ? '' : ', ';
										const prefix = index === authors.length - 1 && index !== 0 ? ' and ' : '';
										if (author.slug) {
											return (
												<span key={`author-${author.id}`}>
													{prefix}
													<a href={`/user/${author.slug}`}>{author.fullName}</a>
													{separator}
												</span>
											);
										}
										return <span key={`author-${author.id}`}>{prefix}{author.fullName}{separator}</span>;
									})}
								</div>
							}
							<div className="details">
								<a
									href={`/pub/${pubData.slug}/versions`}
									className="pt-button pt-minimal date"
									onClick={(evt)=> {
										evt.preventDefault();
										props.setOverlayPanel('versions');
									}}
								>
									<span>{dateFormat(pubData.versions[0].createdAt, 'mmm dd, yyyy')}</span>
									<span>{pubData.versionsList.length}</span>
									<span className="pt-icon-standard pt-align-right pt-icon-multi-select" />

									
								</a>
								<a
									href="#discussions"
									className="pt-button pt-minimal discussions"
								>
									{pubData.discussions.length}
									<span className="pt-icon-standard pt-align-right pt-icon-chat" />
								</a>
								<a
									href={`/pub/${pubData.slug}/collaborators`}
									className="pt-button pt-minimal collaborators"
									onClick={(evt)=> {
										evt.preventDefault();
										props.setOverlayPanel('collaborators');
									}}
								>
									{pubData.collaborators.length}
									<span className="pt-icon-standard pt-align-right pt-icon-team" />
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

PubPresHeader.propTypes = propTypes;
export default PubPresHeader;
