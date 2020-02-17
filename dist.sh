mkdir work/
cp manifest.json work/
cp LICENSE work/
cp README.md work/
mkdir work/src
cp src/contentscript.js work/src/
mkdir work/assets
cp assets/style.css work/assets/
cp assets/logo*.png work/assets/
mkdir dist/
#zip -r work.zip work/
rm dist/RTAddAssetByName.zip
cd work
rar a -r ../dist/RTAddAssetByName.zip ./
cd ..
rm -r work/