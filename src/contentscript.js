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
	
	// Add empty Referenced Assets section
	let div_ref_asset = document.createElement('div');
	div_ref_asset.classList.add('recommended');
	div_ref_asset.innerHTML = 'Recommended Assets: ';
	let ul_ref_asset = document.createElement('ul');
	div_ref_asset.appendChild(ul_ref_asset);

	// Wait for history to load
	let hist = document.getElementById('delayed_ticket_history');
	let hist_check = setInterval(() => {
		// Check if history loaded
		// (Janky workaround, but no access to xhr request)
		if (hist.getElementsByClassName('history-container').length <= 0)
			return;
		//console.log('History loaded.');
		try {
			let referenced_asset_names = findAssetsInHistory(hist);
			referenced_asset_names = findAssetsInHeader()
				.concat(referenced_asset_names);
			let recommended_assets = [];
			for (let referenced_name of referenced_asset_names) {
				let alreadyAttached = false;
				for (let attached_name of attached_assets.map(a => a.name)) {
					if (attached_name.trim() === referenced_name.trim())
						alreadyAttached = true;
				}
				for (let recommended_name of recommended_assets) {
					if (recommended_name.trim() === referenced_name.trim())
						alreadyAttached = true;
				}
				if (alreadyAttached) continue;
				recommended_assets.push(referenced_name);
				let li = document.createElement('li');
				let link = document.createElement('a');
				link.innerHTML = referenced_name;
				link.classList.add('asset-ref');
				link.addEventListener('click', () => {
					if (asset_name_input.value.trim() === '')
						asset_name_input.value = referenced_name;
					else
						asset_name_input.value += ', ' + referenced_name;
					link.classList.add('added');
				});
				li.appendChild(link);
				ul_ref_asset.appendChild(li);
			}
			console.log('Referenced Assets: ', referenced_asset_names);
			if (recommended_assets.length > 0)
				div_add_asset.appendChild(div_ref_asset);
		} catch (ex) { console.error('Failed to parse assets referenced in history.', ex); }
		clearInterval(hist_check);
	}, 500);

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

	function search(com) {
		let prom = searchProm(com)
		.then((id) => {
			asset_id_input.value = (asset_id_input.value + ` asset:${id}`).trim();
		})
		.catch((ex) => {
			asset_name_input.classList.remove('working');
			asset_name_input.classList.add('failed');
		});
		return prom;
	}

	function searchProm(name) {
		return new Promise((resolve, reject) => {
			if (name === '') {
				reject('Failed to look up asset name.');
				return;
			}

			let query = `${window.location.origin}/Asset/Search/Results.html?Format=%27__Name__%27%2C%27__id__%27&OrderBy=Name%7C%7C%7C&Query=Name%20LIKE%20%27${name}%27&Type=Asset`;
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
						reject('Failed to look up asset name.');
						return;
					}
					resolve(id);
				}
			}
			req.onerror = () => {
				reject(req.statusText);
				return;
			}
			req.open('GET', query);
			req.send(null);
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
			asset.name = str_arr[1].trim().toUpperCase();
			assets.push(asset);
		}
		return assets;
	}

	// Find all matches for /[A-Za-z]+[0-9]+/g in history
	// Make them into links to asset pages
	// Return list of asset names
	function findAssetsInHistory(hist_elem) {
		let asset_names = [];

		// Find assets mentioned in ticket comments/correspondence
		let messages = hist_elem.getElementsByClassName('messagebody');
		for (let msg of messages)
			referenceAsset(msg, asset_names);
		
		return asset_names;
	}

	// Return list of asset names referenced in header
	function findAssetsInHeader() {
		try {
			let asset_names = document.getElementById('header')
				.getElementsByTagName('h1')[0]
				.textContent.match(ASSET_NAME_REGEX);
			if (asset_names === null)
				asset_names = [];
			// Remove whitespace in names
			for (let n = 0; n < asset_names.length; n++)
				asset_names[n] = asset_names[n].replace(/\s+/g, '').toUpperCase();
			return asset_names;
		} catch (ex) {
			console.log('Could not parse header for referenced assets', ex);
			return [];
		}
	}
	
	// Recursively replace matching text w/ links
	// COM,STAFF,FNET,LAP,COEDEAN,MK,HYDRA,TESLA,DA,POWERIT
	//  => otherwise netids so point to directory.utk.edu
	//  => include those if lowercase but all uppercase
	// Links for ticket numbers as well?
	//const ASSET_NAME_REGEX = /\b([A-Za-z]{2,7}[0-9]+)\b/g;
	const ASSET_NAME_REGEX =/\b(((COM)|(LAP)|(FNET)|(COEDEAN)|(MK)|(HYDRA)|(TESLA)|(DA)|(POWERIT)) ?[0-9]+)\b/gi;
	const NODE_TYPE_TEXT = 3;
	const NODE_TYPE_ELEM = 1;
	function referenceAsset(node, asset_names) {
		if (node.nodeType === NODE_TYPE_TEXT) {
			// Check if node contains match
			if (!node.nodeValue.match(ASSET_NAME_REGEX))
				return;
			// Insert anchor around matched strings in TEXT node
			let span = document.createElement('span');
			node.parentNode.insertBefore(span, node);
			span.insertAdjacentHTML('beforebegin', node.nodeValue
				// Create element w/ links
				.replace(ASSET_NAME_REGEX, (match) => {
					match = match.replace(/\s+/g, ''); // Remove whitespace
					asset_names.push(match.toUpperCase());
					return `<a class="asset-ref">${match}</a>`;
				}));
			for (let child of node.parentNode.childNodes) {
				if (child.nodeType !== NODE_TYPE_ELEM || !child.classList.contains('asset-ref'))
					continue;
				child.addEventListener('click', () => {
					child.classList.add('working');
					searchProm(child.textContent)
					.then((id) => {
						child.classList.remove('working');
						child.classList.add('succeeded');
						location.href = `/Asset/Display.html?id=${id}`;
					})
					.catch((ex) => {
						console.log(ex);
						child.classList.remove('working');
						child.classList.add('failed');
					});
				});
			}
			span.remove();
			node.remove();
		} else {
			for (let child of node.childNodes) {
				// Don't recurse if child has class 'asset-ref'
				if (child.nodeType === NODE_TYPE_ELEM && child.classList.contains('asset-ref'))
					continue;
				// Recurse into children
				referenceAsset(child, asset_names);
			}
		}
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
