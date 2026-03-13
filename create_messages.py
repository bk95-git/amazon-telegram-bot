from telegram import InlineKeyboardButton, InlineKeyboardMarkup
import random

# This function allow us to create an HTML message to send
# You can edit all fields of message using HTML syntax

def create_item_html(items):
    response = []
    print(f'{5 * "*"} Creating post {5 * "*"}')

    # Shuffling items
    random.shuffle(items)

    # ===== GESTIONE HEADER =====
    # Lista di frasi casuali per l'header
    frasiCasuali = [
        "🚀 OFFERTA IMPERDIBILE 🚀",
        "💥 SCONTO PAZZESCO 💥",
        "💰 OCCASIONE DA NON PERDERE 💰",
        "⭐ OFFERTA SPECIALE ⭐",
        "⚡ OFFERTA LAMPO ⚡",
        "👑 OFFERTA TOP 👑",
        "💣 BOMBA 💣",
        "🛒 SUPER OFFERTA 🛒",
        "🔥 OFFERTA SCOTTANTE 🔥",
        "🎉 PROMOZIONE IMPERDIBILE 🎉",
    ]

    # Scegli una frase casuale dalla lista
    # HEADER = random.choice(frasiCasuali)

    # --- PER OFFERTE DI PRIMAVERA (temporaneo) ---
    # Commenta la riga sopra e decommenta la prossima per usare un header fisso
    HEADER = "🌸 OFFERTA DI PRIMAVERA 🌸"
    # =============================================

    # Testi statici per footer e pulsante
    FOOTER_LINE1 = "🟢 Condividi il canale su Whatsapp - #adv"
    FOOTER_LINE2 = "⚡ Affrettati, offerta limitata!"
    BUTTON_TEXT = "🛒👉 ACQUISTA SU AMAZON"

    # Iterate over items
    for item in items:
        # If item has an active offer
        if 'off' in item:
            # Creating buy button with custom text
            keyboard = [
                [InlineKeyboardButton(BUTTON_TEXT, url=item["url"])],
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            # Creating message body
            html = ""
            html += f"{HEADER}\n\n"

            # Title with emoji
            html += f"🛍️ <b>{item['title']}</b>\n\n"

            # Description (if available)
            if 'description' in item:
                html += f"{item['description']}\n\n"

            # Invisible image link (generates preview)
            if 'image' in item:
                html += f"<a href='{item['image']}'>&#8205</a>\n"

            # Price section: if savings exists, show original price
            if 'savings' in item and 'original_price' in item:
                html += f"💰 Prima {item['original_price']}€\n"
            html += f"💥 ADESSO {item['price']}\n\n"

            # Footer lines
            html += f"{FOOTER_LINE1}\n"
            html += f"{FOOTER_LINE2}"

            response.append(html)
            response.append(reply_markup)
    return response