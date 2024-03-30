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
	open: [[{text: '✅', callback_data: 'CloseTicket'}, {text: '💬', callback_data: 'AddComment'}]],
	close: [[{text: '✔', callback_data: 'OpenTicket'}, {text: '💬', callback_data: 'AddComment'}]],
	confirmOpen: [[{text: 'Открыть заявку', callback_data: 'ConfirmOpen'}, {text: 'Отмена', callback_data: 'RefreshStatus'}]],
	confirmClose: [[{text: 'Закрыть заявку', callback_data: 'ConfirmClose'}, {text: 'Отмена', callback_data: 'RefreshStatus'}]],
	userAddComment: [[{text: '❓ Добавить комментарий', callback_data: 'UserAddComment'}]],
	threadPin: [[{text: 'Закрыть тему', callback_data: 'CloseThread'}]],
	threadPinConfirm: [[{text: 'Подтвердить', callback_data: 'ConfirmCloseThread'}, {text: 'Отмена', callback_data: 'CancelCloseThread'}]]
};