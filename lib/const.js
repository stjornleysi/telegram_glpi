const { Markup } = require('telegraf');
exports.colors = ['Чёрный', 'Синий', 'Жёлтый', "Розовый"];
exports.printers = ['Canon', 'Kyocera', 'Epson', 'SHARP', 'HP', "Brother", 'Lexmark']

exports.keyboards = {
	main: Markup.keyboard(
			[['Принтеры', 'Сброс пароля'], ["Физические устройства", "Сеть"], ['Программное обеспечение', "Отменить заявку"]]
		).resize(),
	printers: Markup.keyboard(
			[['Замена картриджа', 'Настройка принтера'], ['Другие проблемы', "Назад"]]
		).resize(),
	applications: Markup.keyboard(
			[['Загрузка сайтов', 'Локальное ПО'], ['Виртуальные машины', 'Назад']]
		).resize(),
	back: Markup.keyboard(
			[['Назад']]
		).resize(),
	colors: Markup.keyboard(
			[['Чёрный', 'Синий'], ['Жёлтый', "Розовый", 'Назад']]
		).resize(),
	printModels: Markup.keyboard(
			[['Canon', 'Kyocera', 'Epson', 'SHARP'], ['HP', "Brother", 'Lexmark', 'Назад']]
		).resize(),
	final: Markup.keyboard(
			[['Отправить заявку', 'Назад', 'Отменить заявку']]
		).resize(),
	start: Markup.keyboard([['Подать заявку']]).resize()
};

exports.inlineKeyboards = {
	open: [[{text: '✅', callback_data: 'CloseTicket'}, {text: '➡️', callback_data: 'AssignTicket'}, {text: '*️⃣', callback_data: 'ChangeStatus'}]],
	close: [[{text: '✔', callback_data: 'OpenTicket'}, {text: '➡️', callback_data: 'AssignTicket'}, {text: '*️⃣', callback_data: 'ChangeStatus'}]],
	confirmOpen: [[{text: 'Открыть заявку', callback_data: 'ConfirmOpen'}, {text: 'Отмена', callback_data: 'RefreshTicket'}]],
	confirmClose: [[{text: 'Закрыть заявку', callback_data: 'ConfirmClose'}, {text: 'Отмена', callback_data: 'RefreshTicket'}]],
	userAddComment: [[{text: '❓ Добавить комментарий', callback_data: 'UserAddComment'}]],
	changeStatus: [[{text: 'В ожидание', callback_data: 'WaitingStatus'}, {text: 'В работу', callback_data: 'WorkingStatus'}], [{text: 'Открыть тему', callback_data: 'OpenThread'}, {text: 'Отмена', callback_data: 'RefreshTicket'}]],
	configUserGroups: [
		[{text: 'Add new group', callback_data: 'AddNewGroup'}, {text: 'Add new user in group', callback_data: 'AddNewUser'}],
		[{text: 'Remove group', callback_data: 'RemoveGroup'}, {text: 'Remove user', callback_data: 'RemoveUser'}, {text: 'Exit', callback_data: 'ExitConfig'}]
	],
	confirmConfig: [[{text: 'Confirm', callback_data: 'ConfirmConfig'}, {text: 'Cancell', callback_data: 'CancellConfirm'}]]
};

