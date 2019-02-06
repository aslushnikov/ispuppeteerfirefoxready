set -e

git pull origin master

if [ -e ./puppeteer ]; then
  cd puppeteer
  git pull origin master
else
  git clone --depth 1 https://github.com/GoogleChrome/puppeteer
  cd puppeteer
fi

npm i
cd experimental/puppeteer-firefox
npm i
cd ../..

npm run funit -- --firefox-status | tail -1 > ../status.json
cd ..

if [ -z "$(git status --untracked-files=no --porcelain)" ]; then
  exit 0;
fi

git commit -am 'chore: update status.json'
git push origin master
