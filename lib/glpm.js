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
	}catch(e){
		fs.appendFileSync(__dirname + "/../logs/logs.json", JSON.stringify(e, null, 3));
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
	}catch(e){
		fs.appendFileSync(__dirname + "/../logs/logs.json", JSON.stringify(e, null, 3));
	}
}

exports.assignTicket = async (ticketId, userId) => {
	try{
		const session = await glpi.initSession();
		let token = session.data.session_token;
		const response = await axios(conf.glpiConfig.apiurl + '/Ticket_User', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'App-Token': conf.glpiConfig.app_token,
				'Authorization': conf.glpiConfig.user_token,
				'Session-Token': token
			},
			data: JSON.stringify({
				input: {
					tickets_id: ticketId,
					users_id: userId,
					type: 2
				}
			})
		});
		return response.data;
	}catch(e){
		fs.appendFileSync(__dirname + "/../logs/logs.json", JSON.stringify(e, null, 3));
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
	}catch(e){
		fs.appendFileSync(__dirname + "/../logs/logs.json", JSON.stringify(e, null, 3));
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
	}catch(e){
		fs.appendFileSync(__dirname + "/../logs/logs.json", JSON.stringify(e, null, 3));
	}
}

exports.addComment = async(ticketId, comment) => {
	try{
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
		});
		return response.data;
	}catch(e){
		fs.appendFileSync(__dirname + "/../logs/logs.json", JSON.stringify(e, null, 3));
	}
}

exports.removeComment = async(ticketId, commentId) => {
	try{
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
		});
		return response.data;
	}catch(e){
		fs.appendFileSync(__dirname + "/../logs/logs.json", JSON.stringify(e, null, 3));
	}
}

exports.getUsers = async(ticketId) => {
	try{
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
		});
		return response.data;
	}catch(e){
		fs.appendFileSync(__dirname + "/../logs/logs.json", JSON.stringify(e, null, 3));
	}
}