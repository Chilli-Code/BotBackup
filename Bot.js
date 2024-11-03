const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Inicializar el cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
});

// Generar el código QR para la conexión
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el código QR con tu WhatsApp.');
});

// Indicar que el bot está listo
client.on('ready', () => {
    console.log('El bot de WhatsApp está listo y conectado!');
});

// Objeto para almacenar el estado y los datos de cada usuario
let userSessions = {};

// Función para crear o resetear los datos de una conversación específica
function initializeUserSession(userId) {
    userSessions[userId] = {
        awaitingDetails: false,
        awaitingConfirmation: false,
        editField: '',
        resumenClipSubmenu: false, // Para el submenú de la opción 2
        partidoData: {
            fecha: '',
            hora: '',
            equipos: '',
            cancha: '',
            descripcion: ''
        }
    };
}

// Función para verificar si todos los campos requeridos están completos
function isPartidoDataComplete(partidoData) {
    return partidoData.fecha && partidoData.hora && partidoData.equipos && partidoData.cancha;
}

client.on('message', async (message) => {
    const userId = message.from; // ID único del usuario
    const lowerMessage = message.body.toLowerCase();

    // Inicializar la sesión del usuario si no existe
    if (!userSessions[userId]) {
        initializeUserSession(userId);
    }

    const session = userSessions[userId];

    // Comando de salida
    if (lowerMessage === 'exit' || lowerMessage === 'salir') {
        message.reply('Gracias por usar nuestro servicio. ¡Hasta la próxima!');
        initializeUserSession(userId); // Reinicia la sesión del usuario para salir del flujo
        return;
    }

    // Comprobar si el usuario selecciona "menu" para desplegar las opciones
    if (lowerMessage === 'menu' && !session.awaitingDetails && !session.awaitingConfirmation) {
        message.reply(`*Menú principal*\n
            1️⃣ *Compra De Partido 📽️*.\n
            2️⃣ *Compra de Resumen y Clip 🎬*.\n
            3️⃣ *Combo Completo 📦*.\n 
            4️⃣ *Precios 💸* \n \n
            Por favor ingresa el número de la opción que deseas seleccionar.`);
        return;
    }

    // Responde según la opción seleccionada
    if (!session.awaitingDetails && !session.awaitingConfirmation && !session.resumenClipSubmenu) {
        switch (lowerMessage) {
            case '1':
                message.reply(
                    `Has seleccionado *Compra De Partido*. Por favor completa la siguiente información:\n\n` +
                    `*Fecha del partido*: \n (_Ej: Dia/Mes/Año_) \n` + 
                    `*Hora del partido*: \n` +
                    `*Equipos del partido*: \n` +
                    `*Cancha*: \n` +
                    `*Descripción (Opcional):* \n _Describa su Indumentaria_ \n \n` + 
                    `_Escriba *Ok* Para Continuar_: \n` 
                );
                session.awaitingDetails = true; // Cambia el estado para esperar los detalles del partido
                break;
            case '2':
                // Activa el submenú de Resumen y Clip
                session.resumenClipSubmenu = true;
                message.reply(
                    `Has seleccionado *Resumen y Clip*. Por favor elige una opción:\n\n` + 
                    `1️⃣ *Clips Personalizados* \n \n` + 
                    `2️⃣ *Resumen Del Partido* \n \n` +
                    `3️⃣ *Ambos*`
                );
                break;
            case '3':
                message.reply(
                    `Has seleccionado *Combo Completo 📦*.\n\n` +
                    `Este paquete es totalmente personalizable, permitiéndote seleccionar varios partidos, resúmenes y clips según tus preferencias. ` +
                    `Nuestro equipo de ventas se pondrá en contacto contigo para ajustar los detalles y ofrecerte un precio personalizado.\n\n` +
                    `Selecciona una opción:\n` 
                );
                session.awaitingComboConfirmation = true;
                break;
            case '4':
                message.reply(`Has seleccionado *Precios*. Aquí puedes obtener información sobre este paquete.\n \n` +
                    `✅ *Descargar Partido*🏟️: _20.000💵_ \n` +
                    `✅ *Resumen Del Partido*: _12.000💵_ \n\n` +   
                    `✅ *Clips Personalizados*: \n \n` + 
                    `⚫ _Clip Corto:_ *5.000💵* Para aquellos momentos breves y destacados, el precio es más accesible, ideal para jugadas individuales, goles, o momentos clave. \n \n` +
                    `⚫ _Clip Largo:_ *10.000💵* Si deseas más cobertura en el video, los precios se ajustan de manera ascendente, permitiéndote obtener un análisis detallado o secuencias completas del partido.`

                );
                break;
            default:
                if (!isNaN(lowerMessage)) {
                    message.reply('Por favor ingresa solamente el número de la opción en el menú.');
                }
        }
    } else if (session.resumenClipSubmenu) {
        // Manejar la selección del submenú de Resumen y Clip
        switch (lowerMessage) {
            case '1':
                message.reply('Has seleccionado *Clips Personalizados*. Un asesor se pondrá en contacto contigo para coordinar los detalles.');
                break;
            case '2':
                message.reply('Has seleccionado *Resumen Del Partido*. Procesaremos un resumen detallado y te lo enviaremos pronto.');
                break;
            case '3':
                message.reply('Has seleccionado *Ambos*. Recibirás tanto los clips personalizados como el resumen del partido.');
                break;
            default:
                message.reply('Por favor selecciona una opción válida (1, 2 o 3) para Resumen y Clip.');
                return;
        }
        // Resetea el estado del submenú para permitir nuevas interacciones en el menú principal
        session.resumenClipSubmenu = false;
        return;
    }
// En algún lugar después del menú principal para manejar la respuesta del Combo Completo
if (session.awaitingComboConfirmation) {
    if (lowerMessage === '5') {
        // Opción para cerrar sesión y conectar con un asesor
        message.reply('¡Gracias! Un asesor se pondrá en contacto contigo en breve para personalizar tu Combo Completo.');
        
        // Finaliza la sesión del bot
        delete userSessions[userId];
    } else if (lowerMessage === '0') {
        // Opción para regresar al menú principal
        message.reply(`Volviendo al menú principal...\n\n*Menú principal*\n` +
            `1️⃣ *Compra De Partido 📽️*.\n` +
            `2️⃣ *Compra de Resumen y Clip 🎬*.\n` +
            `3️⃣ *Combo Completo 📦*.\n` +
            `Por favor ingresa el número de la opción que deseas seleccionar.`
        );
        
        // Restablece el estado del combo completo para el menú principal
        session.awaitingComboConfirmation = false;
    } else {
        // Mensaje en caso de que la opción ingresada no sea válida
        message.reply('Por favor selecciona una opción válida:\n1️⃣ *Continuar* o 0️⃣ *Atrás*');
    }
    return;
}

    // Manejo del flujo principal de Compra De Partido después de la selección de la opción 1
    else if (session.awaitingDetails && !session.awaitingConfirmation) {
        // Identificar y guardar cada campo de datos del partido
        if (!session.partidoData.fecha) {
            session.partidoData.fecha = message.body;
            message.reply('✅ Fecha guardada. Ahora ingresa la *Hora del partido*.');
        } else if (!session.partidoData.hora) {
            session.partidoData.hora = message.body;
            message.reply('✅ Hora guardada. Ahora ingresa los *Equipos del partido*.');
        } else if (!session.partidoData.equipos) {
            session.partidoData.equipos = message.body;
            message.reply('✅ Equipos guardados. Ahora ingresa la *Cancha*.');
        } else if (!session.partidoData.cancha) {
            session.partidoData.cancha = message.body;
            message.reply('✅ Cancha guardada. Ahora ingresa la *Descripción (Opcional)* o escribe "N/A" si no deseas incluirla.');
        } else if (!session.partidoData.descripcion) {
            session.partidoData.descripcion = message.body;
            if (isPartidoDataComplete(session.partidoData)) {
                message.reply(`🎉 ¡Partido en bandeja! Aquí tienes la información proporcionada:\n\n` +
                    `*Fecha*: ${session.partidoData.fecha}\n` +
                    `*Hora*: ${session.partidoData.hora}\n` +
                    `*Equipos*: ${session.partidoData.equipos}\n` +
                    `*Cancha*: ${session.partidoData.cancha}\n` +
                    `*Descripción*: ${session.partidoData.descripcion}\n\n` +
                    `¿Deseas editar algún dato o continuar con el registro?\n\n` +
                    `9️⃣ *Editar*\n` +
                    `2️⃣ *Continuar*`
                );
                session.awaitingDetails = false;
                session.awaitingConfirmation = true; // Cambia el estado para esperar confirmación
            } else {
                message.reply('Por favor asegúrate de completar toda la información.');
            }
        }
    } else if (session.awaitingConfirmation) {
        // Manejar la respuesta de confirmación
        if (lowerMessage === '9') {
            // Inicia el proceso de edición
            message.reply(`¿Qué dato deseas editar?\n\n` +
                `1️⃣ *Fecha del partido*\n` +
                `2️⃣ *Hora del partido*\n` +
                `3️⃣ *Equipos del partido*\n` +
                `4️⃣ *Cancha*\n` +
                `5️⃣ *Descripción*`
            );
            session.editField = ''; // Resetear el campo a editar
        } else if (lowerMessage === '2') {
            // Confirma y finaliza el registro
            message.reply('✅ Su partido está en progreso. Dentro de 30 horas le enviaremos la información.');
            initializeUserSession(userId); // Reinicia el flujo de conversación para el usuario
        } else if (['1', '2', '3', '4', '5'].includes(lowerMessage)) {
            // Selecciona el campo específico para edición
            session.editField = lowerMessage; // Guarda el campo seleccionado
            session.awaitingDetails = false; 
            session.awaitingConfirmation = false; // Cambia el estado para esperar el nuevo valor
            switch (session.editField) {
                case '1':
                    message.reply('Por favor ingresa la nueva *Fecha del partido*:');
                    break;
                case '2':
                    message.reply('Por favor ingresa la nueva *Hora del partido*:');
                    break;
                case '3':
                    message.reply('Por favor ingresa los nuevos *Equipos del partido*:');
                    break;
                case '4':
                    message.reply('Por favor ingresa la nueva *Cancha*:');
                    break;
                case '5':
                    message.reply('Por favor ingresa la nueva *Descripción (Opcional)*:');
                    break;
            }
        } else if (session.editField) {
            // Guarda el dato editado
            switch (session.editField) {
                case '1':
                    session.partidoData.fecha = message.body;
                    break;
                case '2':
                    session.partidoData.hora = message.body;
                    break;
                case '3':
                    session.partidoData.equipos = message.body;
                    break;
                case '4':
                    session.partidoData.cancha = message.body;
                    break;
                case '5':
                    session.partidoData.descripcion = message.body;
                    break;
            }
            session.editField = ''; // Limpia el campo de edición
            session.awaitingConfirmation = true; // Vuelve al estado de confirmación
            message.reply(
                `🎉 ¡Partido en bandeja! Aquí tienes la información actualizada:\n\n` +
                `*Fecha*: ${session.partidoData.fecha}\n` +
                `*Hora*: ${session.partidoData.hora}\n` +
                `*Equipos*: ${session.partidoData.equipos}\n` +
                `*Cancha*: ${session.partidoData.cancha}\n` +
                `*Descripción*: ${session.partidoData.descripcion}\n\n` +
                `¿Deseas editar algún otro dato o continuar?\n\n` +
                `9️⃣ *Editar*\n` +
                `2️⃣ *Continuar*`
            );
        }
    }
});




// Iniciar el cliente
client.initialize();  
