import { Readable } from 'stream';
import request from 'request-promise';
import xmlbuilder from 'xmlbuilder';

const getDoiLogin = (communityId) => {
	const {
		DOI_LOGIN_ID,
		DOI_LOGIN_PASSWORD,
		MITP_DOI_LOGIN_ID,
		MITP_DOI_LOGIN_PASSWORD,
		IASTATE_DOI_LOGIN_ID,
		IASTATE_DOI_LOGIN_PASSWORD,
		AAS_DOI_LOGIN_ID,
		AAS_DOI_LOGIN_PASSWORD,
		MEDIASTUDIES_DOI_LOGIN_ID,
		MEDIASTUDIES_DOI_LOGIN_PASSWORD,
	} = process.env;
	if (
		communityId === '99608f92-d70f-46c1-a72c-df272215f13e' || // HDSR
		communityId === '00c13b77-f067-4b53-8f11-c97aa4b024ff' // Projections
	) {
		return { login: MITP_DOI_LOGIN_ID, password: MITP_DOI_LOGIN_PASSWORD };
	}
	if (communityId === '3d9ea6a4-25b9-42d3-8ceb-22459c649096') {
		return { login: IASTATE_DOI_LOGIN_ID, password: IASTATE_DOI_LOGIN_PASSWORD };
	}
	if (communityId === '25c2cfeb-dc5b-4dd7-9c82-19146688a931') {
		return { login: AAS_DOI_LOGIN_ID, password: AAS_DOI_LOGIN_PASSWORD };
	}
	if (
		communityId === '3f8575cb-cdf7-48bb-8985-f4eee1b6c624' ||
		communityId === 'd895a0ea-f471-4730-9c4a-3d5de1733ccb'
	) {
		return { login: MEDIASTUDIES_DOI_LOGIN_ID, password: MEDIASTUDIES_DOI_LOGIN_PASSWORD };
	}
	return { login: DOI_LOGIN_ID, password: DOI_LOGIN_PASSWORD };
	if (communityId === '25c2cfeb-dc5b-4dd7-9c82-19146688a931') {
		return { login: AAS_DOI_LOGIN_ID, password: AAS_DOI_LOGIN_PASSWORD };
	}
	if (
		communityId === '3f8575cb-cdf7-48bb-8985-f4eee1b6c624' ||
		communityId === 'd895a0ea-f471-4730-9c4a-3d5de1733ccb'
	) {
		return { login: MEDIASTUDIES_DOI_LOGIN_ID, password: MEDIASTUDIES_DOI_LOGIN_PASSWORD };
	}
};

export const submitDoiData = (json, timestamp, communityId) => {
	const { DOI_SUBMISSION_URL } = process.env;
	const { login, password } = getDoiLogin(communityId);
	const xmlObject = xmlbuilder.create(json, { headless: true }).end({ pretty: true });
	const readStream = new Readable();
	// eslint-disable-next-line no-underscore-dangle
	readStream._read = function noop() {};
	readStream.push(xmlObject);
	readStream.push(null);
	readStream.path = `/${timestamp}.xml`;
	return request({
		method: 'POST',
		url: DOI_SUBMISSION_URL,
		formData: {
			login_id: login,
			login_passwd: password,
			fname: readStream,
		},
		headers: {
			'content-type': 'multipart/form-data',
			'user-agent': 'PubPub (mailto:hello@pubpub.org)',
		},
	});
};
