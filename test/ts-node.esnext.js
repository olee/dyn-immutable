const env = 'esnext';
console.log(`Using tsconfig project at ${__dirname}/tsconfig.${env}.json`);
require('ts-node').register({
    project: `${__dirname}/tsconfig.${env}.json`,
});
