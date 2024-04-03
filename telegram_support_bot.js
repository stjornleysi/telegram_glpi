const {Telegraf, Markup} = require('telegraf');
const glpm = require('./lib/glpm.js');
const cns = require('./lib/const.js');
const {sleep, parseMessageText, htmlToText} = require('./lib/utils.js');
const fs = require('fs');

const dir = __dirname;
let ticketData = {};
const conf = JSON.parse(fs.readFileSync(dir + "/data/conf.json"));
const glpiUrl = conf.glpiConfig.apiurl.replace("apirest.php", "");
let threadsData = JSON.parse(fs.readFileSync(dir + "/data/threads.json"));

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
}).catch(error => console.log(error));

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
}).catch(error => console.log(error));

bot.hears('Отменить заявку', async (ctx) => {
	if(ctx.chat.id != conf.supportChatId){
		delete ticketData[ctx.chat.id];
		await ctx.reply('Заявка отменена', Markup.keyboard([['Подать заявку']]).resize());
			await deleteMessage(ctx, ctx.message.message_id - 1);
			await deleteMessage(ctx, ctx.message.message_id);
	}
}).catch(error => console.log(error));

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
		let res = await glpm.createTicket(title, textToGLPI);
		let messageText = `<a href="http://example.com/${ctx.chat.id}/${ctx.message.message_id+2}">&#8203</a>`;
		messageText += `🟢 <b>ЗАЯВКА  <a href="${glpiUrl}front/ticket.form.php?id=${res}">№${res}</a></b>\n\n`;
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
		await ctx.reply('Заявка отправлена', cns.keyboards.start);
		await deleteMessage(ctx, ctx.message.message_id - 1);
		await deleteMessage(ctx, ctx.message.message_id);
		let messageUserText = messageText.replace('">&#8203</a>', `/${messg.message_id}">&#8203</a>`);
		await ctx.telegram.sendMessage(ctx.message.chat.id, messageUserText, {
			parse_mode: 'HTML',
			reply_markup: {inline_keyboard: cns.inlineKeyboards.userAddComment}
		});
		delete ticketData[ctx.chat.id];
	}
}).catch(error => console.log(error));

	// Обработка сообщений

bot.on('text', async (ctx) => {
	if(ctx.chat.id != conf.supportChatId){
		let ticketId;
		try{
			ticketId = ctx.message.reply_to_message.text.split('№')[1].split('\n')[0];
		}catch{}
		if(!ticketData.hasOwnProperty(ctx.chat.id) && ticketId){
			if(!threadsData.hasOwnProperty(ticketId)){
				let generalMessageId = ctx.message.reply_to_message.entities[0].url.split('/')[5];
				await createThread(ticketId, generalMessageId, ctx.chat.id, ctx.message.reply_to_message.message_id);
			}
			let userName = ctx.chat.first_name + ' ' + ctx.chat.last_name;
			let messageText = `<b>Комментарий от ${userName}:</b>\n\n${ctx.message.text}`;
			await bot.telegram.sendMessage(conf.supportChatId, messageText, {parse_mode: "HTML", message_thread_id: threadsData[ticketId]["threadId"]});
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
		let thread = {};
		let ticket;
		for(let i in threadsData){
			if(threadsData[i].threadId == ctx.message.message_thread_id){
				thread = threadsData[i];
				ticket = i;
				break;	
			}
		}
		if(thread.hasOwnProperty('threadId') && thread.userChatId){
			await bot.telegram.sendMessage(thread.userChatId, ctx.message.text, {reply_parameters: {message_id: thread.userMessgId}});
		}
		await glpm.addComment(ticket, ctx.message.text);
	}
}).catch(error => console.log(error));

	// Обработка изображений из приватных чатов

bot.on('photo', async (ctx) => {
	if(ctx.chat.id != conf.supportChatId){
		if(!ticketData.hasOwnProperty(ctx.chat.id)){
			let ticketId;
			try{
				ticketId = ctx.message.reply_to_message.text.split('№')[1].split('\n')[0];
			}catch{}
			if(!ticketId) return;
			if(!threadsData.hasOwnProperty(ticketId)){
				let generalMessageId = ctx.message.reply_to_message.entities[0].url.split('/')[5];
				await createThread(ticketId, generalMessageId, ctx.chat.id, ctx.message.reply_to_message.message_id);
			}
			await bot.telegram.sendPhoto(conf.supportChatId, ctx.message.photo[0].file_id, {message_thread_id: threadsData[ticketId]["threadId"]});
		}	
	}
}).catch(error => console.log(error));

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

async function editMessage(message, keyboard, silent){
	try{
		let ticketId = message.text.split('\n')[0].split('№')[1];
		let chatId = message.chat.id;
		let ticketData = await glpm.getItem('Ticket', ticketId);
		message['status'] = ticketData.status;
		if(message.entities[0].url.split('/')[5]) silent = undefined;
		messageText = await parseMessageText(message, silent);
		let inKeyboard = JSON.parse(JSON.stringify(keyboard));
		if(inKeyboard[0][0].text == "✔" || inKeyboard[0][0].text == '✅'){
			if(threadsData.hasOwnProperty(ticketId)){
				delete inKeyboard[0][1].callback_data;
				inKeyboard[0][1]["url"] = `t.me/c/${conf.supportChatId.substring(4)}/${threadsData[ticketId].threadId}`;
			}else{
				delete inKeyboard[0][1].url;
				inKeyboard[0][1].callback_data = 'AddComment';
			}
		}
		await bot.telegram.editMessageText(chatId, message.message_id, undefined, messageText, {
			parse_mode: 'HTML',
			reply_markup: {inline_keyboard: inKeyboard},
			entities: message.entities
		});
	}catch{}
}

	//	Создаём обработчики инлайн кнопок		

createAction('ConfirmOpen', 1, cns.inlineKeyboards.open);
createAction('ConfirmClose', 6, cns.inlineKeyboards.close);
createAction('OpenTicket', null, cns.inlineKeyboards.confirmOpen);
createAction('CloseTicket', null, cns.inlineKeyboards.confirmClose);
createAction('CloseThread', null, cns.inlineKeyboards.threadPinConfirm);
createAction('CancelCloseThread', null, cns.inlineKeyboards.threadPin);

function createAction(action, status, keyboard){
	try{
		bot.action(action, async (ctx) => {
			let message = ctx.update.callback_query.message;
			if(status){
				let ticketId = message.text.split('\n')[0].split('№')[1];		
				await glpm.changeStatusTicket(ticketId, status);
				if(dataId.hasOwnProperty(ticketId)) dataId[ticketId].status = status;
				if(status == 6){
					let userChatId = message.entities[0].url.split('/')[3];
					let userMessgId = message.entities[0].url.split('/')[4];
					if(userChatId){
						await bot.telegram.sendMessage(userChatId, "<b>Заявка закрыта</b>", {
							reply_parameters: {message_id: userMessgId},
							parse_mode: "HTML"
						});
					}
					if(threadsData.hasOwnProperty(ticketId)){
						let thread = threadsData[ticketId].threadId;
						await bot.telegram.deleteForumTopic(conf.supportChatId, thread);
						delete threadsData[ticketId];						
						let jsonData = JSON.stringify(threadsData, null, 3);
						fs.writeFileSync(dir + "/data/threads.json", jsonData);						
					}
				}				
			}
			await editMessage(message, keyboard);
		});
	}catch(error){
		console.error('Failed to action: ' + action, error);
	}
}

	// Обработчик для кнопки "Отмена"

bot.action('RefreshStatus', async (ctx) => {
	let message = ctx.update.callback_query.message;
	let ticketId = message.text.split('\n')[0].split('№')[1];
	let ticketData = await glpm.getItem('Ticket', ticketId);
	switch(ticketData.status){
		case 1: await editMessage(message, cns.inlineKeyboards.open); break;
		case 2: await editMessage(message, cns.inlineKeyboards.open); break;
		case 4: await editMessage(message, cns.inlineKeyboards.open); break;
		case 6: await editMessage(message, cns.inlineKeyboards.close); break;
		default: await editMessage(message, cns.inlineKeyboards.close); break;
	}
}).catch(error => console.log(error));

	// Обработчик для кнопки с облачком, которая создает новую тему

bot.action('AddComment', async (ctx) => {
	let message = ctx.update.callback_query.message;
	let userChatId = message.entities[0].url.split('/')[3];
	let userMessgId = message.entities[0].url.split('/')[4];
	let generalMessageId = message.entities[0].url.split('/')[5];
	if(!generalMessageId) generalMessageId = message.message_id;
	let ticketId = message.text.split('\n')[0].split('№')[1];
	if(!threadsData.hasOwnProperty(ticketId)){
		await editMessage(message, message.reply_markup.inline_keyboard, generalMessageId);
		await createThread(ticketId, generalMessageId, userChatId, userMessgId);
	}
}).catch(error => console.log(error));

	// Создание новой темы

async function createThread(ticketId, generalMessageId, userChatId, userMessageId){
    let thread = await bot.telegram.createForumTopic(conf.supportChatId, ticketId);
    threadsData[ticketId] = {
        "userChatId": userChatId,
        "userMessgId": userMessageId,
        "threadId": thread.message_thread_id
    };
    let ticket = await glpm.getItem('Ticket', ticketId);
	let inKeyboard = JSON.parse(JSON.stringify(cns.inlineKeyboards.open));
    if (ticket.status == 6 || ticket.status == 5){
		inKeyboard = JSON.parse(JSON.stringify(cns.inlineKeyboards.close));		
	}
    delete inKeyboard[0][1].callback_data;
	inKeyboard[0][1]["url"] = `t.me/c/${conf.supportChatId.substring(4)}/${thread.message_thread_id}`;
    await bot.telegram.editMessageReplyMarkup(conf.supportChatId, generalMessageId, undefined, { inline_keyboard: inKeyboard });
    let msg = await bot.telegram.copyMessage(conf.supportChatId, conf.supportChatId, generalMessageId, {
        parse_mode: 'HTML',
        disable_notification: true,
        message_thread_id: thread.message_thread_id,
        reply_markup: { inline_keyboard: cns.inlineKeyboards.threadPin }
    });
    await bot.telegram.pinChatMessage(conf.supportChatId, msg.message_id, { disable_notification: true });
    let jsonData = JSON.stringify(threadsData, null, 3);
    fs.writeFileSync(dir + "/data/threads.json", jsonData);
}

bot.action('UserAddComment', async (ctx) => {
	await ctx.reply('Чтобы отправить комментарий, <b>ответьте на сообщение с номером заявки</b> (которое начинается с 🟢)', {parse_mode: "HTML"});
});

	// Закрыть тему

bot.action('ConfirmCloseThread', async (ctx) => {
	let message = ctx.update.callback_query.message;
	let ticketId = message.text.split('№')[1].split('\n')[0];
	let messageId = message.entities[0].url.split('/')[5];
	message.message_id = messageId;
	delete threadsData[ticketId];
	await bot.telegram.deleteForumTopic(conf.supportChatId, message.message_thread_id);
	let ticket = await glpm.getItem("Ticket", ticketId);
	let inKeyboard = cns.inlineKeyboards.open;
	if(ticket.status == 6 || ticket.status == 5) inKeyboard = cns.inlineKeyboards.close;
	await editMessage(message, inKeyboard);
	let jsonData = JSON.stringify(threadsData, null, 3);
	fs.writeFileSync(dir + "/data/threads.json", jsonData);
}).catch(error => console.log(error));

process.on('uncaughtException', (error) => {
    console.log(error);
});

bot.launch();

	// Сборщик заявок и комментариев из GLPI

let dataId = JSON.parse(fs.readFileSync(dir + "/data/dataId.json"));

(async () => {
	let counter = 0;	// счетчик для выполнения функции refreshStatus()
    while (true) {
		try{

	// Собираем заявки

			let listTickets = await glpm.getAllItems('Ticket', 4);
			for(let i = 5; i >= 0; i--){
				let ticketId;
				if(!listTickets) break;
				ticketId = listTickets[i].id;
				if(ticketId <= dataId.ticket) continue;
				if(listTickets[i].users_id_recipient != conf.glpiConfig.user_id){
					let usersArray = await glpm.getUsers(ticketId);
					let authorEmail;
					if(!usersArray[0]) continue;
					if(usersArray[0].hasOwnProperty('alternative_email') && usersArray[0].alternative_email){
						authorEmail = usersArray[0].alternative_email;
					}else{
						let temp = await glpm.getItem("User", usersArray[0].users_id);
						authorEmail = temp.firstname + ' ' + temp.realname;
					}
					let text = await htmlToText(listTickets[i].content);
					let messageText = `🟢 <b>ЗАЯВКА  <a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">№${ticketId}</a></b>\n\n`;
					messageText += `<b>Автор заявки: </b>${authorEmail}\n`;
					messageText += `<b>Проблема: </b>${listTickets[i].name}\n<b>Описание: </b>`;
					messageText += text;
					if(messageText.length > 600){
						messageText = `${messageText.substring(0, 500)} + '\n\n<b><a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">Читать дальше</a></b>`;
					}
					let messg = await bot.telegram.sendMessage(conf.supportChatId, messageText, {
						parse_mode: 'HTML',
						reply_markup: { inline_keyboard: cns.inlineKeyboards.open }
					});
					let silentInfo = `<a href="http://example.com///${messg.message_id}">&#8203</a>`;
					await bot.telegram.editMessageText(conf.supportChatId, messg.message_id, undefined, silentInfo + messageText, {
						parse_mode: 'HTML',
						reply_markup: { inline_keyboard: cns.inlineKeyboards.open }
					});
					dataId.history[ticketId] = {};
					dataId.history[ticketId]["messageId"] = messg.message_id;
					dataId.history[ticketId]["status"] = 1; 
					dataId.ticket = ticketId;
				}
				fs.writeFileSync(dir + "/data/dataId.json", JSON.stringify(dataId, null, 3));
			}

	// Собираем комментарии

			let listComments = await glpm.getAllItems('ITILFollowup', 4);
			for (let i = 5; i >= 0; i--) {
				let commentId = listComments[i].id;
				if (commentId <= dataId.comment) continue;
				if (listComments[i].users_id != conf.glpiConfig.user_id){
					let ticketId = listComments[i].items_id;
					let text = await htmlToText(listComments[i].content);
					let user;
					if (listComments[i].users_id) {
						let temp = await glpm.getItem("User", listComments[i].users_id);
						user = temp.firstname + ' ' + temp.realname;
					} else {
						let temp = await glpm.getUsers(ticketId);
						user = temp[0].alternative_email;
					}
					await addComment(text, ticketId, user);
				}
				dataId.comment = commentId;
				fs.writeFileSync(dir + "/data/dataId.json", JSON.stringify(dataId, null, 3));
			}
		}catch(err){ console.log(err) }
        await sleep(10000);
		counter++;
		if(counter >= 60){
			await refreshStatus();
			counter = 0;
		}
    }
})();

	// Отправка комментария в Telegram

async function addComment(comment, ticketId, user){
    try{
        threadsData = JSON.parse(fs.readFileSync(dir + "/data/threads.json"));
        if(!threadsData.hasOwnProperty(ticketId)){
			if(!dataId.history.hasOwnProperty(ticketId)) return;
			let generalMessageId = dataId.history[ticketId].messageId;
			await createThread(ticketId, generalMessageId);
        }
        let messageText = `<b>Комментарий от ${user}:</b>\n\n${comment}`;
		if(messageText.length > 2400){
			messageText = `${messageText.substring(0, 2400)} + '\n\n<b><a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">Читать дальше</a></b>`;
		}
        await bot.telegram.sendMessage(conf.supportChatId, messageText, {parse_mode: "HTML", message_thread_id: threadsData[ticketId]["threadId"]});
    }catch(err){console.log(err)}
}

	// обновляет статусы последних 50 заявок

async function refreshStatus(){
	let listTickets = await glpm.getAllItems('Ticket', 49);
	dataId = JSON.parse(fs.readFileSync(dir + "/data/dataId.json"));	
	for(let i = 50; i >= 0; i--){
		let ticketId = listTickets[i].id;
		try{
			if(dataId["history"][ticketId].status != listTickets[i].status && listTickets[i].users_id_recipient != conf.glpiConfig.user_id){
				let messageId = dataId["history"][ticketId].messageId;
				let color = '🟢';
				switch(listTickets[i].status){
					case 1: color = '🟢'; break;
					case 2: color = '🔵'; break;
					case 4: color = '🟠'; break;
					case 6: color = '⚫'; break;
					default: color = '⚫';
				}  				
				let usersArray = await glpm.getUsers(ticketId);
				let authorEmail;
				if(usersArray[0].hasOwnProperty('alternative_email') && usersArray[0].alternative_email){
					authorEmail = usersArray[0].alternative_email;
				}else{
					let temp = await glpm.getItem("User", usersArray[0].users_id);
					authorEmail = temp.firstname + ' ' + temp.realname;
				}				
				let text = await htmlToText(listTickets[i].content);
				let messageText = `${color} <b>ЗАЯВКА  <a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">№${ticketId}</a></b>\n\n`;
				messageText += `<b>Автор заявки: </b>${authorEmail}\n`;
				messageText += `<b>Проблема: </b>${listTickets[i].name}\n<b>Описание: </b>`;
				messageText += text;
				if(messageText.length > 600){
					messageText = `${messageText.substring(0, 500)} + '\n\n<b><a href="${glpiUrl}front/ticket.form.php?id=${ticketId}">Читать дальше</a></b>`;
				}
				let silentInfo = `<a href="http://example.com///${messageId}">&#8203</a>`;
				let inKeyboard;
				if(listTickets[i].status == 5 || listTickets[i].status == 6){
					inKeyboard = JSON.parse(JSON.stringify(cns.inlineKeyboards.close));
				}else{
					inKeyboard = JSON.parse(JSON.stringify(cns.inlineKeyboards.open));
				}
				if(threadsData.hasOwnProperty(ticketId)){
					delete inKeyboard[0][1].callback_data;
					inKeyboard[0][1]["url"] = `t.me/c/${conf.supportChatId.substring(4)}/${threadsData[ticketId].threadId}`;
				}
				await bot.telegram.editMessageText(conf.supportChatId, messageId, undefined, silentInfo + messageText, {
					parse_mode: 'HTML',
					reply_markup: { inline_keyboard: inKeyboard }
				});
				dataId.history[ticketId]["status"] = listTickets[i].status;
			}
		}catch(err){}
	}
	fs.writeFileSync(dir + "/data/dataId.json", JSON.stringify(dataId, null, 3));
}
