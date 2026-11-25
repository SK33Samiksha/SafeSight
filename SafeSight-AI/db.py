from pymongo import MongoClient

from config import MONGO_DB, MONGO_URI

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

# The Node backend owns these collections (it writes them via Mongoose);
# the AI service only reads missing persons to compare against.
missing_collection = db["missing_persons"]
