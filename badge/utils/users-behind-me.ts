import { GITHUB_TOTAL_USERS } from '../badge.consts';

function truncateToTwoDecimals(num: number) {
  return Math.trunc(num * 100) / 100;
}

export const getUsersBehindMe = (rank: number): string => {
  const usersBehindMe = GITHUB_TOTAL_USERS - rank;
  const percentage = truncateToTwoDecimals((usersBehindMe / GITHUB_TOTAL_USERS) * 100);
  return `${percentage}%`;
};
