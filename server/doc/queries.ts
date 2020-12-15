import { Doc } from 'server/models';

export const createDoc = (content: {}, postgresTransaction: any = null) => {
	return Doc.create({ content: content }, { transaction: postgresTransaction });
};
