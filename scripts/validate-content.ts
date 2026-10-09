import { checkParity, getContent } from '../content/index';

const problems = checkParity(getContent('ko'), getContent('en'));
if (problems.length > 0) {
  console.error('ko/en content mismatch:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.info('content ok: ko/en parity verified');
