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

	// Update html
	// Add asset name field
	let asset_name_input = document.createElement('input');
	asset_name_input.size = '10';
	asset_name_input.id = 'add-asset-by-name-input';
	asset_name_input.placeholder = 'Asset Name';
	asset_name_input.type = 'text';
	asset_name_input.addEventListener('keyup', event => {
		asset_name_input.classList.remove('failed');
	});
	label.appendChild(document.createTextNode(' or '));
	label.appendChild(asset_name_input);
	// Replace add-asset button
	submit_button.style.display = 'none';
	let btn = document.createElement('div');
	div_add_asset.appendChild(btn);
	btn.id = 'add-asset-by-name-button';
	btn.innerHTML = '+';	

	// Look up asset name
	function lookup(com) {
		if (com === '') {
			form.submit();
			return;
		}

		console.log('Looking up asset name...');
		let query = `https://rt.eecs.utk.edu/Asset/Search/Results.html?Format=%27__Name__%27%2C%27__id__%27&OrderBy=Name%7C%7C%7C&Query=Name%20LIKE%20%27${com}%27&Type=Asset`;
		let req = new XMLHttpRequest();
		req.onreadystatechange = () => {
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
					asset_name_input.classList.add('failed');
					return;
				}
				console.log(`Asset id for ${com} is ${id}.`);
				asset_id_input.value = `asset:${id}`;
				form.submit();
			}
		}
		req.open('GET', query, true);
		req.send(null);
		
	}

	// Add listeners
	form.addEventListener('submit', event => {
		event.preventDefault();
		lookup(asset_name_input.value);
	});
	btn.addEventListener('click', event => {
		event.preventDefault();
		lookup(asset_name_input.value);
	});

})();
