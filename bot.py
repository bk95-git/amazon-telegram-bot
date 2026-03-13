#from sre_parse import CATEGORIES
from typing import Dict, List
import telegram
from amazon_api import search_items
from create_messages import create_item_html
import time
from datetime import datetime
from itertools import chain
import random
from consts import *
import logging

logging.basicConfig(level=logging.INFO)

# ********** Author: Samir Salman **********


# Search keywords definition
"""
A dictionary with {CATEGORY_NAME: [<LIST OF THE CATEGORY KEYWORDS>]}
"""

categories = {
    # 📱 ELETTRONICA E INFORMATICA
    "Electronics": ["televisori", "smartphone", "tablet", "cuffie", "altoparlanti", "fotocamere", "videocitofoni", "caricabatterie", "power bank", "smartwatch"],
    "Computers": ["notebook", "mouse", "tastiera", "monitor", "ssd", "hard disk", "stampante", "router", "webcam", "tablet grafico"],
    "CellPhones": ["iphone", "samsung", "xiaomi", "cover", "pellicola", "supporto auto", "auricolari bluetooth"],
    "VideoGames": ["playstation", "xbox", "nintendo", "giochi ps5", "giochi xbox", "controller", "cuffie gaming"],
    "Software": ["antivirus", "office", "windows", "photoshop", "videogiochi pc"],
    "GPS": ["navigatore", "gps auto", "gps moto", "localizzatore"],

    # 🏠 CASA E CUCINA
    "HomeGarden": ["aspirapolvere", "scopa elettrica", "termosifoni", "ventilatore", "deumidificatore", "tende", "lenzuola", "cuscini", "materassi"],
    "Kitchen": ["caffettiera", "macchina caffè", "pentole", "padelle", "coltelli", "tostapane", "frullatore", "forno microonde", "bilancia"],
    "Furniture": ["scrivania", "sedia ufficio", "libreria", "comodino", "armadio", "mensole"],
    "HomeImprovement": ["utensili", "trapano", "cacciavite", "scala", "vernice", "ferramenta"],
    "Appliances": ["frigorifero", "lavatrice", "asciugatrice", "lavastoviglie", "condizionatore", "aspiratore"],

    # 🧴 BELLEZZA E CURA PERSONALE
    "Beauty": ["crema viso", "crema corpo", "shampoo", "balsamo", "makeup", "trucco", "rossetto", "fondotinta", "spazzola", "phon", "piastra"],
    "PersonalCare": ["spazzolino elettrico", "rasoio", "epilatore", "bilancia pesapersone", "massaggiatore", "termometro"],
    "HealthPersonalCare": ["integratori", "vitamine", "mascherine", "pronto soccorso", "tiralatte"],

    # 🍝 ALIMENTARI E BEVANDE
    "Grocery": ["caffè", "pasta", "olio", "cioccolato", "the", "biscotti", "cereali", "scatolame", "sughi", "snack"],
    "GroceryAndGourmet": ["vino", "birra", "spumante", "prosciutto", "formaggi", "prodotti tipici"],
    "PetSupplies": ["cibo cane", "cibo gatto", "lettiera", "antipulci", "guinzaglio", "giochi animali"],

    # 👕 ABBIGLIAMENTO E ACCESSORI
    "Clothing": ["maglietta", "felpa", "jeans", "pantaloni", "giacca", "cappotto", "costume", "pigiama"],
    "Shoes": ["scarpe uomo", "scarpe donna", "scarpe bambino", "scarpe sportive", "stivali", "sandali"],
    "Jewelry": ["orologio", "collana", "bracciale", "anello", "orecchini"],
    "Watches": ["orologio uomo", "orologio donna", "smartwatch", "cinturino"],
    "Luggage": ["valigia", "zaino", "borsa", "marsupio", "portafoglio"],

    # 👶 BAMBINI E NEONATI
    "Baby": ["pannolini", "salviette", "biberon", "tiralatte", "passeggino", "seggiolone", "giochi neonato"],
    "Toys": ["giochi bimbi", "lego", "barbie", "macchinine", "peluche", "puzzle"],
    "BabyProducts": ["ciuccio", "scaldabiberon", "sterilizzatore", "fasce porta bebè"],

    # 📚 LIBRI, FILM E MUSICA
    "Books": ["libri best seller", "romanzi", "libri tecnici", "ebook", "libri bambini"],
    "DVD": ["film", "serie tv", "blu ray", "dvd"],
    "Music": ["cd", "vinile", "artisti"],

    # 🏃 SPORT E TEMPO LIBERO
    "Sports": ["palla da calcio", "scarpe running", "tuta sportiva", "pesi", "manubri", "tapis roulant", "cyclette"],
    "Outdoor": ["tenda", "sacco a pelo", "scarpette arrampicata", "zaino trekking", "borraccia"],
    "Fitness": ["materassino yoga", "elastici fitness", "corda salto", "guanti palestra"],
    "Bicycles": ["bici", "casco bici", "luci bici", "catena", "portabici"],
    "CampingHiking": ["fornello campeggio", "pala", "torcia", "bussola"],

    # 🚗 AUTO E MOTO
    "Automotive": ["olio motore", "batteria auto", "tappetini auto", "seggiolino auto", "catene neve", "antifurto"],
    "Motorcycle": ["casco moto", "guanti moto", "antifurto moto", "copertura moto"],

    # 🛠️ UFFICIO E CANCELLERIA
    "OfficeProducts": ["penne", "quaderni", "agende", "post-it", "evidenziatore", "taglierina", "carta"],
    "OfficeElectronics": ["fotocopiatrice", "proiettore", "lavagna interattiva"],

    # 🎵 ALTRE CATEGORIE UTILI
    "MusicalInstruments": ["chitarra", "pianoforte", "batteria", "violino", "cuffie studio"],
    "Industrial": ["attrezzatura professionale", "sicurezza lavoro", "magazzino"],
    "GiftCards": ["buono regalo amazon", "carta regalo"],
    "EverythingElse": ["regali originali", "idee regalo", "articoli vari"]
}



def is_active() -> bool:
    now = datetime.now().time()
    return MIN_HOUR < now.hour < MAX_HOUR


def send_consecutive_messages(list_of_struct: List[str]) -> None:
    bot.send_message(
        chat_id=CHANNEL_NAME,
        text=list_of_struct[0],
        reply_markup=list_of_struct[1],
        parse_mode=telegram.ParseMode.HTML,
    )

    bot.send_message(
        chat_id=CHANNEL_NAME,
        text=list_of_struct[2],
        reply_markup=list_of_struct[3],
        parse_mode=telegram.ParseMode.HTML,
    )
    return list_of_struct[4:]


# run bot function
def run_bot(bot: telegram.Bot, categories: Dict[str, List[str]]) -> None:
    # start loop
    while True:
        try:
            items_full = []
            # iterate over keywords
            for category in categories:
                for keyword in categories[category]:
                    # iterate over pages
                    for page in range(1, 10):
                        items = search_items(keyword, category, item_page=page)
                        # api time limit for another http request is 1 second
                        time.sleep(1)
                        items_full.extend(items)

            logging.info(f'{5 * "*"} Requests Completed {5 * "*"}')

            # shuffling results times
            random.shuffle(items_full)

            # creating html message, you can find more information in create_messages.py
            res = create_item_html(items_full)

            # while we have items in our list
            while len(res) > 3:

                # if bot is active
                if is_active():
                    try:
                        # Sending two consecutive messages
                        logging.info(f'{5 * "*"} Sending posts to channel {5 * "*"}')
                        res = send_consecutive_messages(res)

                    except Exception as e:
                        logging.info(e)
                        res = res[4:]
                        continue

                    # Sleep for PAUSE_MINUTES
                    time.sleep(60 * PAUSE_MINUTES)

                else:
                    # if bot is not active
                    logging.info(
                        f'{5 * "*"} Inactive Bot, between  {MIN_HOUR}AM and {MAX_HOUR}PM {5 * "*"}'
                    )
                    time.sleep(60 * 5)

        except Exception as e:
            logging.info(e)


if __name__ == "__main__":
    # Create the bot instance
    bot = telegram.Bot(token=TOKEN)
    # running bot
    run_bot(bot=bot, categories=categories)
