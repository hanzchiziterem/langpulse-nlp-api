import * as authUtils from '@/utils/auth';

export const mockGetUserIdFromToken = (returnValue: string | null) => {
  jest.spyOn(authUtils, 'getUserIdFromToken').mockImplementation(() => returnValue);
};
