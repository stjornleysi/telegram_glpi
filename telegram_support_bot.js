const {Telegraf, Markup} = require('telegraf');
const glpm = require('./lib/glpm.js');
const cns = require('./lib/const.js');
const {parseTickets, parseComments, refreshStatus, editTicketStatus} = require('./lib/glpiParse.js');
const {sleep, createThread, closeThread, getTicketColor, editMessageMarkup, editMessageText} = require('./lib/utils.js');
const fs = require('fs');

const dir = __dirname;
let ticketData = {};
let conf = JSON.parse(fs.readFileSync(dir + "/data/conf.json"));
const glpiUrl = conf.glpiConfig.apiurl.replace("apirest.php", "");
let messageData = JSON.parse(fs.readFileSync(dir + "/data/messageData.json"));
let configData = {};

const bot = new Telegraf(conf.telegramBotToken, {
	handlerTimeout: 90000 * 5
});

bot.start(async (ctx) => {
	ctx.reply('Добро пожаловать в чат-бот технической поддержки ' + conf.CompanyName, cns.keyboards.start);
	await deleteMessage(ctx, ctx.message.message_id);
	delete ticketData[ctx.chat.id];
});

bot.hears('Подать заявку', async (ctx) => {
	if(ctx.chat.id != conf.supportChatId){
		ticketData[ctx.chat.id] = {'navigate': [], 'flag': '', 'data': {'Автор заявки': '', 'Кабинет': ''}};
		ticketData[ctx.chat.id]['chatId'] = ctx.message.chat.id;
		await ctx.reply('Выберите, пожалуйста, наиболее подходящую категорию', cns.keyboards.main);
		await deleteMessage(ctx, ctx.message.message_id);
	}
});

	//	Настройка кнопок для переназначения заявки

bot.hears('/configurationUserGroups', async (ctx) => {
	if(ctx.chat.id == conf.supportChatId){
		await bot.telegram.sendMessage(conf.supportChatId, 'Выберите действие', {
			parse_mode: 'HTML',
			reply_markup: {inline_keyboard: cns.inlineKeyboards.configUserGroups}
		});
		await deleteMessage(ctx, ctx.message.message_id);
	}
});

	//	Создаём кнопки основного меню

createButton('Принтеры', 'Категория', cns.keyboards.printers, cns.keyboards.main, 'Выберите проблему');
createButton('Замена картриджа', 'Проблема', cns.keyboards.colors, cns.keyboards.printers, 'Выберите цвет картриджа');
for(let i = 0; i < cns.colors.length; i++){
	createButton(cns.colors[i], 'Цвет картриджа', cns.keyboards.printModels, cns.keyboards.colors, 'Выберите модель принтера');
}
for(let i = 0; i < cns.printers.length; i++){
	createButton(cns.printers[i], 'Модель принтера', cns.keyboards.back, cns.keyboards.printModels, 'Укажите, пожалуйста, номер кабинета', "location", false);	
}
createButton('Настройка принтера', 'Проблема', cns.keyboards.printModels, cns.keyboards.printers, 'Выберите модель принтера');
createButton('Другие проблемы', 'Проблема', cns.keyboards.printModels, cns.keyboards.printers, 'Выберите модель принтера');
createButton(
	'Сброс пароля', 'Категория', cns.keyboards.back, cns.keyboards.main, 'Укажите, пожалуйста, номер кабинета',
	"location", "Укажите программное обеспечение, от которого утерян пароль, и Ваш логин к нему (по возможности)"
);
createButton('Физические устройства', 'Категория', cns.keyboards.back, cns.keyboards.main, 'Укажите, пожалуйста, номер кабинета', "location", "Опишите Вашу проблему");
createButton('Программное обеспечение', 'Категория', cns.keyboards.applications, cns.keyboards.main, 'Выберите проблему');
createButton('Загрузка сайтов', 'Проблема', cns.keyboards.back, cns.keyboards.applications, 'Укажите, пожалуйста, номер кабинета', "location", "Опишите Вашу проблему");
createButton('Локальное ПО', 'Проблема', cns.keyboards.back, cns.keyboards.applications, 'Укажите, пожалуйста, номер кабинета', "location", "Опишите Вашу проблему");
createButton('Виртуальные машины', 'Проблема', cns.keyboards.back, cns.keyboards.applications, 'Укажите, пожалуйста, номер кабинета', "location", "Опишите Вашу проблему");
createButton('Сеть', 'Категория', cns.keyboards.back, cns.keyboards.main, 'Укажите, пожалуйста, номер кабинета', "location", "Опишите Вашу проблему");

	//	Общие команды для основного меню
								
bot.hears('Назад', async (ctx) => {
	try{
		if(ctx.chat.id != conf.supportChatId){
			let keys = Object.keys(ticketData[ctx.chat.id]['data']);
			let lastKey = keys[keys.length - 1];
			delete ticketData[ctx.chat.id]['data'][lastKey];
			await ctx.reply('Возвращаемся', ticketData[ctx.chat.id]['navigate'].pop());
			await deleteMessage(ctx, ctx.message.message_id - 1);
			await deleteMessage(ctx, ctx.message.message_id);			
		}
	}catch{
		ctx.reply('Добро пожаловать в чат-бот технической поддержки ' + conf.CompanyName, cns.keyboards.start);
	}
});

bot.hears('Отменить заявку', async (ctx) => {
	if(ctx.chat.id != conf.supportChatId){
		delete ticketData[ctx.chat.id];
		await ctx.reply('Заявка отменена', Markup.keyboard([['Подать заявку']]).resize());
			await deleteMessage(ctx, ctx.message.message_id - 1);
			await deleteMessage(ctx, ctx.message.message_id);
	}
});

bot.hears('Отправить заявку', async (ctx) => {
	if(ctx.chat.id != conf.supportChatId && ticketData.hasOwnProperty(ctx.chat.id) && ticketData[ctx.chat.id].data["Кабинет"].length > 1){
		if(!ctx.chat.last_name) ctx.chat.last_name = '';
		ticketData[ctx.chat.id]['data']['Автор заявки'] = ctx.chat.first_name + ' ' + ctx.chat.last_name;
		let title = ticketData[ctx.chat.id].
						data["Кабинет"] + ' - ' + ticketData[ctx.chat.id].
						data["Категория"] + ' - ' + ticketData[ctx.chat.id].
						data["Автор заявки"];
		let textToGLPI = '';
		for(key in ticketData[ctx.chat.id]['data']){
			textToGLPI += '<b>' + key + ':</b> ' + ticketData[ctx.chat.id]['data'][key].replace(/[<>/]/g, '') + '<br>';
		}	
		let ticketId = await glpm.createTicket(title, textToGLPI);
		let messageText = `🟢 <b>ЗАЯВКА  <a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">№${ticketId}</a></b>\n\n`;
		let userLogin = '';
		if(ctx.chat.username) userLogin = ' (@' + ctx.chat.username + ')';
		ticketData[ctx.chat.id]['data']['Автор заявки'] += userLogin;
		for(key in ticketData[ctx.chat.id]['data']){
			messageText += '<strong>' + key + ': </strong> ' + ticketData[ctx.chat.id]['data'][key].replace(/[<>/]/g, '') + '\n';
		}
		let messg = await ctx.telegram.sendMessage(conf.supportChatId, messageText, {
			parse_mode: 'HTML',
			reply_markup: {inline_keyboard: cns.inlineKeyboards.open}
		});
		messageData.data[ticketId] = {
			messageId: messg.message_id,
			userMassageId: ctx.message.message_id + 2,
			userChatId: ctx.chat.id,
			status: 1
		}
		let threadTitle = `🟢 ${ticketId}${title.replace(ticketData[ctx.chat.id].data["Кабинет"], '')}`;
		await createThread(bot, messageData, ticketId, threadTitle);
		await ctx.reply('Заявка отправлена', cns.keyboards.start);
		await deleteMessage(ctx, ctx.message.message_id - 1);
		await deleteMessage(ctx, ctx.message.message_id);
		await ctx.telegram.sendMessage(ctx.chat.id, messageText, {
			parse_mode: 'HTML',
			reply_markup: {inline_keyboard: cns.inlineKeyboards.userAddComment}
		});
		fs.writeFileSync(dir + "/data/messageData.json", JSON.stringify(messageData, null, 3));
		delete ticketData[ctx.chat.id];
	}
});

	// Обработка сообщений

bot.on('text', async (ctx) => {
	if(ctx.chat.id != conf.supportChatId){
		let ticketId;
		try{
			ticketId = ctx.message.reply_to_message.text.split('№')[1].split('\n')[0];
		}catch{}
		if(!ticketData.hasOwnProperty(ctx.chat.id) && ticketId){
			if(!messageData.data[ticketId].hasOwnProperty('threadId')){
				let ticket = await glpm.getItem('Ticket', ticketId);
				let title = `🟢 ${ticketId} - ${ticket.name}`;
				await createThread(bot, messageData, ticketId, title);
			}
			if(!ctx.chat.last_name) ctx.chat.last_name = '';
			let userName = ctx.chat.first_name + ' ' + ctx.chat.last_name;
			let messageText = `<b>Комментарий от ${userName}:</b>\n\n${ctx.message.text}`;
			await bot.telegram.sendMessage(conf.supportChatId, messageText, {
				parse_mode: "HTML", message_thread_id: messageData.data[ticketId].threadId
			});
			let discript = `<b><font color="blue">Комментарий от ${userName}:</font></b><br><br>`;
			await glpm.addComment(ticketId, discript + ctx.message.text);
		}else if(ticketId){
			await ctx.reply("Чтобы отправить комментарий, завершите текущую заявку, отмените её или перезапустите бота");
			return;
		}else if(ticketData[ctx.chat.id] && ticketData[ctx.chat.id]["flag"] == 'location'){
			ticketData[ctx.chat.id]['data']['Кабинет'] = ctx.message.text;
			if(ticketData[ctx.chat.id]["nextText"]){
				await ctx.reply(ticketData[ctx.chat.id]["nextText"]);
				ticketData[ctx.chat.id]["flag"] = 'description';
				await deleteMessage(ctx, ctx.message.message_id - 1);
				await deleteMessage(ctx, ctx.message.message_id);
			}else{
				await ctx.reply('Подтвердите отправку', cns.keyboards.final);
				await deleteMessage(ctx, ctx.message.message_id - 1);
				await deleteMessage(ctx, ctx.message.message_id);								
			}			
		}else if(ticketData[ctx.chat.id] && ticketData[ctx.chat.id]["flag"] == 'description'){
			ticketData[ctx.chat.id]['data']['Описание'] = ctx.message.text;
			await ctx.reply('Подтвердите отправку', cns.keyboards.final);
			await deleteMessage(ctx, ctx.message.message_id - 1);
			await deleteMessage(ctx, ctx.message.message_id);
		}
	}else if(ctx.message.message_thread_id){
		let ticket;
		for(let i in messageData.data){
			if(messageData.data[i].threadId == ctx.message.message_thread_id){
				ticket = i;
				break;	
			}
		}
		if(messageData.data[ticket].hasOwnProperty('userChatId')){
			try{
				await bot.telegram.sendMessage(messageData.data[ticket].userChatId, ctx.message.text, {
					reply_parameters: {message_id: messageData.data[ticket].userMassageId}
				});
			}catch{
				await bot.telegram.sendMessage(messageData.data[ticket].userChatId, ctx.message.text);				
			}
		}
		await glpm.addComment(ticket, ctx.message.text);
	}else if(configData.hasOwnProperty("flag")){
		configData["text"] = ctx.message.text.trim();
		configData["id"] = ctx.message.message_id;
	}
});

	// Обработка изображений из приватных чатов

bot.on('photo', async (ctx) => {
	if(ctx.chat.id != conf.supportChatId){
		let ticketId;
		let messg = ctx.message.reply_to_message.text;
		try{
			ticketId = messg.split('№')[1].split('\n')[0];
		}catch{}
		if(!ticketData.hasOwnProperty(ctx.chat.id) && ticketId){
			if(!messageData.data[ticketId].hasOwnProperty(threadId)){
				let ticket = await glpm.getItem('Ticket', ticketId);
				let title = `🟢 ${ticketId}${ticket.name.split('-')[1]}-${ticket.name.split('-')[2]}`;
				await createThread(bot, messageData, ticketId, title);
			}
			await bot.telegram.sendPhoto(conf.supportChatId, ctx.message.photo[0].file_id, {message_thread_id: messageData.data[ticketId]["threadId"]});
		}	
	}
});

	// Сохраняем ID последнего сообщения в чате

bot.on('message', async (ctx) => {
	if(ctx.message.forum_topic_edited){
		await deleteMessage(ctx, ctx.message.message_id);
	}
});

	// Функция для создания кнопок основного меню с похожим функционалом

function createButton(buttonName, param, keyboard, navKeyboard, messg, flag, nextText){
	bot.hears(buttonName, async (ctx) => {
		if(ctx.chat.id != conf.supportChatId && ticketData.hasOwnProperty(ctx.chat.id)){
			ticketData[ctx.chat.id]['navigate'].push(navKeyboard);	
			ticketData[ctx.chat.id]['data'][param] = buttonName;
			await ctx.reply(messg, keyboard);
			await deleteMessage(ctx, ctx.message.message_id - 1);
			await deleteMessage(ctx, ctx.message.message_id);
			if(flag){
				ticketData[ctx.chat.id]["flag"] = flag;
				ticketData[ctx.chat.id]["nextText"] = nextText;				
			}
		}else{
			ctx.reply('Добро пожаловать в чат-бот технической поддержки ' + conf.CompanyName, cns.keyboards.start);		
		}				
	});	
}

	// Вспомогательные функции

async function deleteMessage(ctx, message_id){
	try{
		await bot.telegram.deleteMessage(ctx.message.chat.id, message_id);
	}catch{}
}

	//	Создаём обработчики инлайн кнопок		

createAction('OpenTicket', cns.inlineKeyboards.confirmOpen);
createAction('CloseTicket', cns.inlineKeyboards.confirmClose);
createAction('ChangeStatus', cns.inlineKeyboards.changeStatus);
createAction('ConfirmOpen', cns.inlineKeyboards.open, 1);
createAction('ConfirmClose', cns.inlineKeyboards.close, 6);
createAction('WaitingStatus', cns.inlineKeyboards.open, 4);
createAction('WorkingStatus', cns.inlineKeyboards.open, 2);
createAction('OpenThread', cns.inlineKeyboards.open);

function createAction(action, keyboard, status){
	try{
		bot.action(action, async (ctx) => {
			let message = ctx.update.callback_query.message;
			let ticketId = message.text.split('\n')[0].split('№')[1];
			let td = messageData.data[ticketId];
			if(status || action == 'OpenThread'){
				await glpm.changeStatusTicket(ticketId, status);
				await editTicketStatus(bot, messageData, message);
				if(status == 6){
					if(td.hasOwnProperty('userChatId')){
						try{
							await bot.telegram.sendMessage(td.userChatId, "<b>Заявка закрыта</b>", {
								reply_parameters: {message_id: td.userMassageId},
								parse_mode: "HTML"
							});
						}catch{
							await bot.telegram.sendMessage(td.userChatId, "<b>Заявка закрыта</b>", {
								parse_mode: "HTML"
							});
						}
					}
					if(td.hasOwnProperty('threadId')){
						await closeThread(bot, messageData, ticketId);
					}
				}else if(!td.hasOwnProperty('threadId') && (status == 1 || action == 'OpenThread')){
					let color = await getTicketColor(status || td.status);
					let title;
					if(td.hasOwnProperty('userChatId')){
						let problem = message.text.split('\n')[4].replace('Категория: ', '');
						let author = message.text.split('\n')[2].replace('Автор заявки: ', '').replace(/\(@[^)]+\)/g, '');
						title = `${color} ${ticketId} - ${problem} - ${author}`;
					}else{
						title = `${color} ${ticketId} - ${message.text.split('\n')[3].replace('Проблема: ', '')}`;
					}
					await createThread(bot, messageData, ticketId, title);
				}
			}else{
				await editMessageMarkup(bot, message.message_id, keyboard);
			}
		});
	}catch(e){
		fs.appendFileSync(dir + "/logs/logs.json", JSON.stringify(e, null, 3));
	}
}

	// Обработчик для кнопки "Отмена"

bot.action('RefreshStatus', async (ctx) => {
	let message = ctx.update.callback_query.message;
	await editTicketStatus(bot, messageData, message);
});

	// Обработчик для кнопки с подсказкой о добавлении комментария

bot.action('UserAddComment', async (ctx) => {
	await ctx.reply('Чтобы отправить комментарий, <b>ответьте на сообщение с номером заявки</b> (которое начинается с 🟢)', {parse_mode: "HTML"});
});

	// Изменить конфигурацию пользовательских групп

createConfigButtons('AddNewGroup', 'Укажите название новой группы');
createConfigButtons('AddNewUser', 'Укажите группу и glpi id пользователя в формате:\n[Группа]: [id]');
createConfigButtons('RemoveGroup', 'Укажите название удаляемой группы');
createConfigButtons('RemoveUser', 'Укажите группу и glpi id пользователя в формате:\n[Группа]: [id]');

function createConfigButtons(action, messageText){
	bot.action(action, async (ctx) => {
		let message = ctx.update.callback_query.message;
		await editMessageText(bot, message.message_id, messageText, cns.inlineKeyboards.confirmConfig)
		configData["flag"] = action;
	});	
}

bot.action('ConfirmConfig', async (ctx) => {
	if(configData.hasOwnProperty('id')){
		let messageId = ctx.update.callback_query.message.message_id;
		switch(configData.flag){
			case "AddNewGroup": conf.userGroups[configData.text] = []; break;
			case "AddNewUser": let gu = configData.text.split(':'); conf.userGroups[gu[0].trim()].push(gu[1].trim()); break;
			case "RemoveGroup": delete conf.userGroups[configData.text]; break;
			case "RemoveUser": let rgu = configData.text.split(':'); let index = conf.userGroups[rgu[0].trim()].indexOf(rgu[1].trim());
				index >= 0 ? conf.userGroups[rgu[0].trim()].splice(index, 1) : false; break;
		}
		let jsonData = JSON.stringify(conf, null, 3);
		fs.writeFileSync(dir + "/data/conf.json", jsonData);
		createAssignActions();
		await deleteMessage(ctx.update.callback_query, configData.id);
		configData = {};
		await editMessageMarkup(bot, messageId, cns.inlineKeyboards.configUserGroups);
	}
});

bot.action('ExitConfig', async (ctx) => {
	configData = {};
	let message = ctx.update.callback_query.message;
	await bot.telegram.deleteMessage(conf.supportChatId, message.message_id);
});

bot.action('CancellConfirm', async (ctx) => {
	await deleteMessage(ctx.update.callback_query, configData.id);
	configData = {};
	let message = ctx.update.callback_query.message;
	await editMessageMarkup(bot, message.message_id, cns.inlineKeyboards.configUserGroups);
});

	// Обработчики для кнопок с переназначением заявок 

bot.action('AssignTicket', async (ctx) => {
	let message = ctx.update.callback_query.message;
	let keyboard = [[]];
	let row = 0;
	for(let key in conf.userGroups){
		if(row == 3){
			keyboard.push([]);
			row = 0;
		}
		keyboard[keyboard.length-1].push({text: key, callback_data: 'ButtonFor_' + key});
		row++;
	}
	keyboard[keyboard.length-1].push({text: 'Отмена', callback_data: 'RefreshStatus'});
	await editMessageMarkup(bot, message.message_id, keyboard);
});

	// Создание обработчиков событий для переназначения заявок

createAssignActions();

function createAssignActions(){
	for(let key in conf.userGroups){
		bot.action('ButtonFor_' + key, async (ctx) => {
			let message = ctx.update.callback_query.message;
			let ticketId = message.text.split('№')[1].split('\n')[0];
			for(let i in conf.userGroups[key]){
				await glpm.assignTicket(ticketId, conf.userGroups[key][i]);
			}
			if(message.text.indexOf("⚫") < 0){
				await glpm.changeStatusTicket(ticketId, 2);
			}
			await editTicketStatus(bot, messageData, message);
			if(messageData.data[ticketId].hasOwnProperty('threadId')){
				await closeThread(bot, messageData, ticketId);
			}
		});		
	}
}

process.on('uncaughtException', (error) => {
    console.log(error);
});

bot.launch();

	// Сборщик заявок и комментариев из GLPI

(async () => {
	let counter = 0;	// счетчик для выполнения функции refreshStatus()
    while (true) {
		try{
			await parseTickets(bot, messageData);
			await parseComments(bot, messageData);
			if(counter >= 60){
				await refreshStatus(bot, messageData);
				counter = 0;
			}
		}catch(e){
			fs.appendFileSync(dir + "/logs/logs.json", JSON.stringify(e, null, 3));
		}
		await sleep(10000);
		counter++;
    }
})();

