const GlpiApi = require('glpi-api');
const axios = require('axios');
const fs = require('fs');

const conf = JSON.parse(fs.readFileSync(__dirname + "/../data/conf.json"));
const glpi = new GlpiApi(conf.glpiConfig);

exports.createTicket = async (title, description) => {
	try{
		const session = await glpi.initSession();
		let token = session.data.session_token;
		const response = await axios(conf.glpiConfig.apiurl + '/Ticket', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'App-Token': conf.glpiConfig.app_token,
				'Authorization': conf.glpiConfig.user_token,
				'Session-Token': token
			},
			data: JSON.stringify({
				input: {
					name: title,
					content: description
				}
			})
		});
		return response.data.id;
	}catch(error){
		console.error('Failed to create ticket:', error);
	}
}

exports.changeStatusTicket = async (ticketId, statusId) => {
	try{
		const session = await glpi.initSession();
		let token = session.data.session_token;
		const response = await axios(conf.glpiConfig.apiurl + '/Ticket', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'App-Token': conf.glpiConfig.app_token,
				'Authorization': conf.glpiConfig.user_token,
				'Session-Token': token
			},
			data: JSON.stringify({
				input: {
					id: ticketId,
					status: statusId
				}
			})
		});
		return response;
	}catch(error){
		console.error('Failed to create ticket:', error);
	}
}

exports.getItem = async(item, id) => {			// ITILFollowup = комментарий
	try{
		const session = await glpi.initSession();
		let token = session.data.session_token;
		const response = await axios(`${conf.glpiConfig.apiurl}/${item}/${id}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'App-Token': conf.glpiConfig.app_token,
				'Authorization': conf.glpiConfig.user_token,
				'Session-Token': token
			}
		});
		return response.data;
	}catch(error){
		return 0;
	}
}

exports.getAllItems = async(item, cnt) => {			
	try{
		const session = await glpi.initSession();
		let token = session.data.session_token;
		const response = await axios(`${conf.glpiConfig.apiurl}/${item}?order=DESC&range=0-${cnt}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'App-Token': conf.glpiConfig.app_token,
				'Authorization': conf.glpiConfig.user_token,
				'Session-Token': token
			}
		});
		return response.data;
	}catch(error){
		return error;
	}
}

exports.addComment = async(ticketId, comment) => {
	const session = await glpi.initSession();
	let token = session.data.session_token;		
	const response = await axios(conf.glpiConfig.apiurl + '/ITILFollowup/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'App-Token': conf.glpiConfig.app_token,
			'Authorization': conf.glpiConfig.user_token,
			'Session-Token': token
		},
		data: JSON.stringify({
			input: {
				items_id: ticketId,
				itemtype: "Ticket",
				content: comment
			}
		})
	}).catch((err) => console.log(err));
	return response.data;
}

exports.removeComment = async(ticketId, commentId) => {
	const session = await glpi.initSession();
	let token = session.data.session_token;		
	const response = await axios(conf.glpiConfig.apiurl + '/ITILFollowup/' + commentId, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			'App-Token': conf.glpiConfig.app_token,
			'Authorization': conf.glpiConfig.user_token,
			'Session-Token': token
		},
		data: JSON.stringify({
			input: {
				items_id: ticketId,
				itemtype: "Ticket"
			}
		})
	}).catch((err) => console.log(err));
	return response.data;
}

exports.getUsers = async(ticketId) => {
	const session = await glpi.initSession();
	let token = session.data.session_token;		
	const response = await axios(`${conf.glpiConfig.apiurl}/Ticket/${ticketId}/Ticket_User`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			'App-Token': conf.glpiConfig.app_token,
			'Authorization': conf.glpiConfig.user_token,
			'Session-Token': token
		}
	}).catch((err) => console.log(err));
	return response.data;
}