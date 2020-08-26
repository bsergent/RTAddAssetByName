(function () {
	// Parse page
	let forms = document.getElementsByTagName('form');
	let form = null;
	for (let f of forms) {
		if (f.getElementsByClassName('add-asset').length > 0) {
			form = f;
			break;
		}
	}
	if (form === null) {
		console.error('Could not find "add-asset" form.');
		return;
	}
	let div_add_asset = document.getElementsByClassName('add-asset')[0];
	let label = div_add_asset.getElementsByTagName('label')[0];
	let inputs = div_add_asset.getElementsByTagName('input');
	let submit_button = null;
	let asset_id_input = null;
	for (let i of inputs) {
		if (i.type === 'submit' && i.value === '+')
			submit_button = i;
		if (i.type === 'text' && i.placeholder === 'Asset #')
			asset_id_input = i;
	}
	if (submit_button === null) {
		console.error('Could not find "add-asset" button.');
		return;
	}
	if (asset_id_input === null) {
		console.error('Could not find "Asset #" input field.');
		return;
	}

	// Compile list of attached assets
	let attached_assets = compileAttachedAssetsList();
	console.log('Attached Assets:', attached_assets);
	// Underline unquoted asset names in comments & correspondence
	//  Maybe just create a link to their entry?
	//  On hover, do a search to see if the asset actually exists,
	//   then highlight in green or red (blue before that)
	// This would normally require checking all assets, so maybe just
	//  write some regex for the basic ones? (COM, LAP, COE, MK)
	// List include but not attached tickets in Links section
	// Option to attach assets mentioned in comment/corresp. update?
	
	// Find assets mentioned in ticket comments/correspondence
	let messages = document.getElementsByClass('messagebody');
	const asset_name_regex = /[A-Za-z]+[0-9]+/g;
	for (let msg of messages) {
		
	}

	// Update html
	// Add asset name field
	let asset_name_input = document.createElement('input');
	asset_name_input.size = '10';
	asset_name_input.id = 'add-asset-by-name-input';
	asset_name_input.placeholder = 'Asset Name';
	asset_name_input.type = 'text';
	asset_name_input.addEventListener('keyup', event => {
		asset_name_input.classList.remove('failed');
		asset_name_input.classList.remove('succeeded');
	});
	label.appendChild(document.createTextNode(' or '));
	label.appendChild(asset_name_input);
	// Replace add-asset button
	submit_button.style.display = 'none';
	let btn = document.createElement('div');
	div_add_asset.appendChild(btn);
	btn.id = 'add-asset-by-name-button';
	btn.innerHTML = '+';	

	// Parse string of names into array
	function parseNames(str) {
		let names = [];
		if (str.indexOf(',') !== -1)
			for (let name of str.split(','))
				names.push(name.trim());
		else
			for (let name of str.split(' '))
				names.push(name.trim());
		return names;
	}

	function search(com) {
		return new Promise((resolve, reject) => {
			if (com === '') {
				resolve()
				return;
			}

			let query = `${window.location.origin}/Asset/Search/Results.html?Format=%27__Name__%27%2C%27__id__%27&OrderBy=Name%7C%7C%7C&Query=Name%20LIKE%20%27${com}%27&Type=Asset`;
			let req = new XMLHttpRequest();
			req.onload = () => {
				if (req.readyState === 4 && req.status === 200) {
					let id = -1;

					// Parse HTML response
					let resp = document.createElement('html');
					resp.innerHTML = req.responseText;
					try {
						let table = resp.getElementsByTagName('table')[0];
						let tbody = table.getElementsByTagName('tbody')[1];
						let td = tbody.getElementsByTagName('td')[1];
						id = parseInt(td.innerText);
					} catch (ex) {}
					
					// Set asset id field and submit
					if (id === -1) {
						console.error('Failed to look up asset name.', req);		
						asset_name_input.classList.remove('working');
						asset_name_input.classList.add('failed');
						reject('Failed to look up asset name.');
						return;
					}
					console.log(`Asset id for ${com} is ${id}.`);
					asset_id_input.value = (asset_id_input.value + ` asset:${id}`).trim();
					resolve(id);
					//form.submit();
				}
			}
			req.onerror = () => {
				asset_name_input.classList.remove('working');
				asset_name_input.classList.add('failed');
				reject(req.statusText);
				return;
			}
			req.open('GET', query);
			req.send(null);
		});
	}

	// Look up asset name
	function lookup(str) {
		if (str === '') {
			form.submit();
			return;
		}

		console.log('Looking up asset id(s) by name...');
		asset_name_input.classList.add('working');
		let searches = [];
		for (let name of parseNames(str))
			searches.push(search(name));
		Promise.all(searches).then((values) => {
			console.log('Submitting form with the following ids:');
			console.log(values);
			asset_name_input.classList.remove('working');
			asset_name_input.classList.add('succeeded');
			form.submit();
		});
	}

	// Parse "Links" for attached assets
	// Returns list of { id: number, name: string }
	function compileAttachedAssetsList() {
		let assets = [];
		//let div_add_asset = document.getElementsByClassName('add-asset')[0];
		//let label = div_add_asset.getElementsByTagName('label')[0];
		//let inputs = div_add_asset.getElementsByTagName('input');
		let div_ticket_info_links = document.getElementsByClassName('ticket-info-links')[0];
		let tr_refers_to = div_ticket_info_links.getElementsByClassName('RefersTo')[0];
		let unordered_list = tr_refers_to.getElementsByTagName('li');
		for (let li of unordered_list) {
			let str_arr = li.getElementsByTagName('a')[0].text.split(':');
			// Assumed string format: "Asset #[0-9]+: .*"
			let asset = { id: -1, name: '' };
			asset.id = parseInt(str_arr[0].substring(7));
			asset.name = str_arr[1].trim();
			assets.push(asset);
		}
		return assets;
	}

	// Add listeners
	form.addEventListener('submit', event => {
		event.preventDefault();
		lookup(asset_name_input.value)
	});
	btn.addEventListener('click', event => {
		event.preventDefault();
		lookup(asset_name_input.value)
	});

})();
