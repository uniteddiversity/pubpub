import React from 'react';
import queryString from 'query-string';

import { getRandomColor } from 'utils/colors';
import { getPubPageTitle } from 'utils/pubPageTitle';
import { CitationManager } from 'client/utils/citations/citationManager';
import { initFirebase } from 'client/utils/firebaseClient';
import { apiFetch } from 'client/utils/apiFetch';
import { NodeLabelMap } from 'client/components/Editor/types';
import { Maybe, PatchFn, PubPageData, Community, LoginData, LocationData } from 'utils/types';

const shimPubContextProps = {
	pubData: {
		nodeLabels: {} as NodeLabelMap | undefined,
		slug: '',
		isReadOnly: false,
		releases: [],
		releaseNumber: 0,
	},
	collabData: { editorChangeObject: {} },
	historyData: {},
	firebaseBranchRef: null,
	updateLocalData: null as any,
	updatePubData: null as any,
	// @ts-expect-error ts-migrate(2554) FIXME: Expected 2-3 arguments, but got 0.
	citationManager: new CitationManager(),
} as any;

type Props = {
	pubData: PubPageData;
	locationData: LocationData;
	communityData: Community;
	loginData: LoginData;
	children: (ctx: typeof shimPubContextProps) => React.ReactNode;
};

type CollabUser = {
	id: string;
	backgroundColor: string;
	cursorColor: string;
	image: Maybe<string>;
	name: string;
	initials: string;
	canEdit: boolean;
};

type State = {
	pubData: PubPageData;
	historyData: {
		currentKey: number;
		latestKey: number;
		isViewingHistory: boolean;
		loadedIntoHistory: boolean;
		historyDocKey: string;
		outstandingRequests: number;
		latestKeyReceivedAt: Maybe<number>;
		timestamps: Record<string, number>;
	};
	collabData: {
		editorChangeObject: any;
		status: string;
		localCollabUser: CollabUser;
		remoteCollabUsers: CollabUser[];
	};
	firebaseRootRef: null | firebase.database.Reference;
	firebaseBranchRef: null | firebase.database.Reference;
	citationManager: CitationManager;
};

type PubContextType = State & {
	updateLocalData: PatchFn<any>;
	updatePubData: PatchFn<PubPageData>;
};

export const PubContext = React.createContext<PubContextType>(shimPubContextProps);

const fetchVersionFromHistory = (pubData, historyKey, accessHash) =>
	// @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
	apiFetch(
		'/api/pubHistory?' +
			queryString.stringify({
				pubId: pubData.id,
				communityId: pubData.communityId,
				branchId: pubData.activeBranch.id,
				historyKey: historyKey,
				accessHash: accessHash,
			}),
	);

const getLocalCollabUser = (pubData, loginData) => {
	const userColor = getRandomColor(loginData.id);
	return {
		id: loginData.id,
		backgroundColor: `rgba(${userColor}, 0.2)`,
		cursorColor: `rgba(${userColor}, 1.0)`,
		image: loginData.avatar || null,
		name: loginData.fullName || 'Anonymous',
		initials: loginData.initials || '?',
		canEdit: !!pubData.canEditBranch,
	};
};

const idleStateUpdater = (boundSetState, timeout = 50) => {
	let queue: any[] = [];
	let idleCallback = null;

	const setStateNow = () =>
		boundSetState((prevState) => {
			idleCallback = null;
			let state = prevState;
			const itemsInQueue = queue.length;
			queue.forEach(([update, maybeCallback]) => {
				const partial = typeof update === 'function' ? update(state) : update;
				state = {
					...state,
					...partial,
				};
				if (maybeCallback) {
					maybeCallback(state);
				}
			});
			queue = queue.slice(itemsInQueue);
			return state;
		});

	const setState = (...args) => {
		queue.push(args);
		if ('requestIdleCallback' in window) {
			if (!idleCallback) {
				// @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'requestIdleCallback'.
				idleCallback = requestIdleCallback(setStateNow, { timeout: timeout });
			}
		} else {
			setStateNow();
		}
	};

	const immediately = (isImmediate = true) => {
		return {
			setState: (...args) => {
				if (isImmediate) {
					queue.push(args);
					setStateNow();
				} else {
					setState(...args);
				}
			},
		};
	};

	return {
		setState: setState,
		immediately: immediately,
	};
};
class PubSyncManager extends React.Component<Props, State> {
	idleStateUpdater: ReturnType<typeof idleStateUpdater>;

	constructor(props: Props) {
		super(props);
		const { pubData } = this.props;
		const { historyData } = pubData;
		const isViewingHistory = historyData.currentKey !== historyData.latestKey;

		this.state = {
			firebaseRootRef: null,
			firebaseBranchRef: null,
			pubData: this.props.pubData,
			collabData: {
				editorChangeObject: {},
				status: 'connecting',
				localCollabUser: getLocalCollabUser(pubData, this.props.loginData),
				remoteCollabUsers: [],
			},
			historyData: {
				...historyData,
				outstandingRequests: 0,
				latestKeyReceivedAt: null,
				isViewingHistory: isViewingHistory,
				loadedIntoHistory: isViewingHistory,
				historyDocKey: `history-${historyData.currentKey}`,
			},
			citationManager: new CitationManager(
				pubData.citationStyle,
				pubData.citationInlineStyle,
				pubData.initialStructuredCitations,
			),
		};
		this.idleStateUpdater = idleStateUpdater(this.setState.bind(this));
		this.syncRemoteCollabUsers = this.syncRemoteCollabUsers.bind(this);
		this.syncMetadata = this.syncMetadata.bind(this);
		this.syncDiscussionsContent = this.syncDiscussionsContent.bind(this);
		this.updatePubData = this.updatePubData.bind(this);
		this.updateCollabData = this.updateCollabData.bind(this);
		this.updateLocalData = this.updateLocalData.bind(this);
		if (typeof window !== 'undefined') {
			// eslint-disable-next-line no-underscore-dangle
			// @ts-expect-error
			window.__pubId__ = this.props.pubData.id;
		}
	}

	componentDidMount() {
		const rootKey = `pub-${this.props.pubData.id}`;
		const branchKey = `branch-${this.props.pubData.activeBranch.id}`;
		initFirebase(rootKey, this.props.pubData.firebaseToken).then((firebaseRefs) => {
			if (!firebaseRefs) {
				return;
			}
			const [rootRef, connectionRef] = firebaseRefs;
			this.setState(
				{
					firebaseRootRef: rootRef,
					firebaseBranchRef: rootRef.child(branchKey),
				},
				() => {
					this.state.firebaseRootRef
						?.child('metadata')
						.on('child_changed', this.syncMetadata);

					this.state.firebaseBranchRef
						?.child('cursors')
						.on('value', this.syncRemoteCollabUsers);

					connectionRef.on('value', (snapshot) => {
						if (snapshot.val() === true) {
							this.updateLocalData('collab', { status: 'connected' });
						} else {
							this.updateLocalData('collab', { status: 'disconnected' });
						}
					});
				},
			);
		});
	}

	componentWillUnmount() {
		if (this.state.firebaseRootRef) {
			this.state.firebaseRootRef.child('metadata').off('child_changed', this.syncMetadata);
		}
	}

	syncMetadata(snapshot) {
		this.setState((prevState) => {
			/* Firebase erases empty arrays, so empty arrays we sync up have */
			/* to be manually reconstructed here */
			let newVal = snapshot.val();
			if (snapshot.key === 'branches') {
				newVal = newVal.map((branch) => {
					return {
						...branch,
						permissions: branch.permissions || [],
					};
				});
			}

			return {
				pubData: {
					...prevState.pubData,
					[snapshot.key]: newVal,
				},
			};
		});
	}

	syncDiscussionsContent(snapshot) {
		this.idleStateUpdater.setState((prevState) => {
			const val = snapshot.val();
			if (val) {
				const syncedDiscussions = Object.values(val);
				const newSyncedDiscussions = syncedDiscussions.filter((item) => {
					const exists = prevState.pubData.discussions.find((existingItem) => {
						// @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
						return item.id === existingItem.id;
					});
					return !exists;
				});
				const updatedDiscussions = prevState.pubData.discussions.map(
					(existingDiscussion) => {
						const syncedContent = syncedDiscussions.find((item) => {
							// @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
							return item.id === existingDiscussion.id;
						});
						return {
							...existingDiscussion,
							// @ts-expect-error ts-migrate(2698) FIXME: Spread types may only be created from object types... Remove this comment to see the full error message
							...(syncedContent || {}),
						};
					},
				);
				return {
					pubData: {
						...prevState.pubData,
						discussions: [...newSyncedDiscussions, ...updatedDiscussions],
					},
				};
			}
			return null;
		});
	}

	syncRemoteCollabUsers(snapshot) {
		const { loginData } = this.props;
		const users = snapshot.val();
		if (users) {
			this.updateCollabData({
				// @ts-expect-error ts-migrate(2571) FIXME: Object is of type 'unknown'.
				remoteCollabUsers: Object.values(users).filter((user) => user.id !== loginData.id),
			});
		}
	}

	updatePubData(newPubData, isImmediate = false) {
		/* First, set the local state. */
		/* Then, sync appropriate data to firebase. */
		/* Other clients will receive updates which */
		/* triggers the syncMetadata function. */
		this.idleStateUpdater.immediately(isImmediate).setState(
			(prevState) => {
				const nextData =
					typeof newPubData === 'function' ? newPubData(prevState.pubData) : newPubData;
				return {
					pubData: {
						...prevState.pubData,
						...nextData,
					},
				};
			},
			() => {
				const keysToSync = [
					'attributions',
					'avatar',
					'branches',
					'citationData',
					'collectionPubs',
					'description',
					'doi',
					'downloads',
					'labels',
					'managers',
					'reviews',
					'slug',
					'title',
					'useHeaderImage',
				];
				const firebaseSyncData = {};
				keysToSync.forEach((key) => {
					if (key in newPubData) {
						firebaseSyncData[key] = newPubData[key];
					}
				});
				const hasUpdates = Object.keys(firebaseSyncData).length;
				if (this.state.firebaseRootRef && hasUpdates) {
					this.state.firebaseRootRef.child('metadata').update(firebaseSyncData);
				}
				if (typeof newPubData.title === 'string') {
					document.title = getPubPageTitle(
						/* this.state.pubData does not always have the newest title. */
						/* My guess is that there are cases where idleStateUpdater */
						/* causes a delay such that this callback is called before */
						/* before the updateState event has completed. This seems */
						/* counterintuitiveand may require us to rethink whether a  */
						/* callback on idleStateUpdater is appropriate. */
						{ ...this.state.pubData, title: newPubData.title },
						this.props.communityData,
					);
				}
			},
		);
	}

	updateCollabData(newCollabData) {
		this.idleStateUpdater.setState((prevState) => {
			return {
				collabData: {
					...prevState.collabData,
					...newCollabData,
				},
			};
		});
	}

	updateHistoryData(newHistoryData) {
		const { pubData, locationData } = this.props;
		const {
			historyData: prevHistoryData,
			collabData: { editorChangeObject },
		} = this.state;
		const now = Date.now();
		const nextHistoryData = { ...prevHistoryData, ...newHistoryData };
		const currentCollabDoc =
			editorChangeObject && editorChangeObject.view && editorChangeObject.view.state.doc;
		if (currentCollabDoc && nextHistoryData.currentKey === nextHistoryData.latestKey) {
			this.idleStateUpdater.setState(({ historyData }) => {
				const nextTimestamp = historyData.timestamps[nextHistoryData.currentKey] || now;
				// Don't add -1 (indicating a lack of entries) as a timestamp
				const timestampUpdate =
					nextHistoryData.currentKey >= 0
						? { [nextHistoryData.currentKey]: nextTimestamp }
						: {};
				return {
					historyData: {
						...historyData,
						...newHistoryData,
						historyDoc: currentCollabDoc.toJSON(),
						historyDocKey: `history-${nextHistoryData.currentKey}`,
						timestamps: {
							[-1]: new Date(pubData.createdAt).valueOf(),
							...historyData.timestamps,
							...timestampUpdate,
						},
					},
				};
			});
		} else {
			this.setState(
				({ historyData }) => ({
					historyData: {
						...historyData,
						outstandingRequests: historyData.outstandingRequests + 1,
					},
				}),
				() =>
					fetchVersionFromHistory(
						pubData,
						newHistoryData.currentKey,
						locationData.query.access,
					).then(({ doc, historyData: { timestamps } }) => {
						this.setState(({ historyData }) => ({
							historyData: {
								...historyData,
								...newHistoryData,
								historyDoc: doc,
								historyDocKey: `history-${nextHistoryData.currentKey}`,
								outstandingRequests: historyData.outstandingRequests - 1,
								timestamps: {
									...historyData.timestamps,
									...timestamps,
								},
							},
						}));
					}),
			);
		}
	}

	updateLocalData(type, data, { isImmediate = false } = {}) {
		if (type === 'pub') {
			this.updatePubData(data, isImmediate);
		}
		if (type === 'collab') {
			this.updateCollabData(data);
		}
		if (type === 'history') {
			this.updateHistoryData(data);
		}
	}

	render() {
		const context = {
			pubData: this.state.pubData,
			collabData: this.state.collabData,
			historyData: this.state.historyData,
			citationManager: this.state.citationManager,
			firebaseBranchRef: this.state.firebaseBranchRef,
			updateLocalData: this.updateLocalData,
			updatePubData: this.updatePubData,
		} as PubContextType;
		return (
			<PubContext.Provider value={context}>
				{this.props.children(context)}
			</PubContext.Provider>
		);
	}
}
export default PubSyncManager;
