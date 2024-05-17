from flask import Flask, render_template, Response, request, abort, send_from_directory
from flask_socketio import SocketIO, emit

from agent import agent_executor, _format_chat_history
from dotenv import load_dotenv
load_dotenv()

import urllib.parse
import random
import json
import time
import os
from flask_cors import CORS

app = Flask(__name__)
socketio = SocketIO(app)
CORS(app)



@app.route('/')
def index():
    return render_template('index.html')

@app.route("/favicon.ico")
def favicon():
    return send_from_directory("./static/img/", "icon.ico", mimetype='image/vnd.microsoft.icon')

@app.route('/file_upload', methods=['POST'])
def file_upload():
    with open(os.path.join(os.environ.get("DATA_PATH"), "chat_index.json"), 'r+') as f:
        file_data = json.load(f)
        
        
    for i,j in request.files.items():
        j.save(os.path.join(os.environ.get("DATA_PATH"), "files", j.filename))
        
        new_id = make_id()
        file_data[new_id] = {
            "type": "file",
            "name": j.name,
            "location": request.form["location"]
        }
                
    with open(os.path.join(os.environ.get("DATA_PATH"), "chat_index.json"), 'r+') as f:
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
        
    return "done"

@app.route('/files/<path:filename>')
def serve_file(filename):
    directory = os.path.join(os.environ.get("DATA_PATH"), "files")
    print(directory, filename)
    return send_from_directory(directory, filename)


def make_id(length=10):
    return "".join(random.choice("1234567890qwertyuiopasdfghjklzxcvbnm") for i in range(length))

@app.route('/message_edit', methods=['POST'])
def message_edit():
    request_data = request.get_json()
    
    with open(os.path.join(os.environ.get("DATA_PATH"), "chats", "{}.json".format(request_data["chat_id"])), 'r+') as f:
        file_data = json.load(f)
        
        for i in file_data["data"]:
            if i["id"] == request_data["message_id"]:
                i["content"] = request_data["content"]
                break
        
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
        return "Success"
    
@app.route('/message_author', methods=['POST'])
def message_author():
    request_data = request.get_json()
    
    with open(os.path.join(os.environ.get("DATA_PATH"), "chats", "{}.json".format(request_data["chat_id"])), 'r+') as f:
        file_data = json.load(f)
        
        for i in file_data["data"]:
            if i["id"] == request_data["message_id"]:
                i["user"] = request_data["author"]
                break
        
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
        return "Success"

@app.route('/message_delete', methods=['POST'])
def message_delete():
    request_data = request.get_json()
    
    with open(os.path.join(os.environ.get("DATA_PATH"), "chats", "{}.json".format(request_data["chat_id"])), 'r+') as f:
        file_data = json.load(f)
        
        for i,j in enumerate(file_data["data"]):
            if j["id"] == request_data["message_id"]:
                del file_data["data"][i]
                break
        
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
        return "Success"

@app.route('/message_new', methods=['POST'])
def message_new():
    request_data = request.get_json()
    
    with open(os.path.join(os.environ.get("DATA_PATH"), "chats", "{}.json".format(request_data["chat_id"])), 'r+') as f:
        file_data = json.load(f)
        
        new_data = list()
        for i,j in enumerate(file_data["data"]):
            new_data.append(j)
            if j["id"] == request_data["message_id"]:
                new_data.append({
                "id": make_id(),
                "user": "human",
                "log": [],
                "content": request_data["content"],
                "time": int(time.time())
            })
            
        file_data["data"] = new_data
        
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
        return "Success"


@app.route("/collapse_folder", methods=['POST'])
def collapse_folder():
    request_data = request.get_json()
    with open(os.path.join(os.environ.get("DATA_PATH"), "chat_index.json"), 'r+') as f:
        
        file_data = json.load(f)
        file_data[request_data["id"]]["active"] = False
        
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
        
        return 'Success'


@app.route("/expand_folder", methods=['POST'])
def expand():
    request_data = request.get_json()
    with open(os.path.join(os.environ.get("DATA_PATH"), "chat_index.json"), 'r+') as f:
        
        file_data = json.load(f)
        file_data[request_data["id"]]["active"] = True
        
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
        
        return 'Success'




@app.route('/folders_add', methods=['POST'])
def folders_add():
    request_data = request.get_json()
    with open(os.path.join(os.environ.get("DATA_PATH"), "chat_index.json"), 'r+') as f:
        
        file_data = json.load(f)
        new_id = make_id()
        file_data[new_id] = {
            "type": request_data["type"],
            "name": request_data['name'],
            "active": True,
            "location": request_data['id']
        }
        
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
    
    if not request_data["type"] == "folder":
        with open(os.path.join(os.environ.get("DATA_PATH"), "chats", "{}.json".format(new_id)), 'w+') as f:
            t = int(time.time())
            data = {
                "created_at": t,
                "last_updated": t,
                "data": []
            }
            
            json.dump(data, f)
                
    return 'Success'
    
@app.route('/folders_name', methods=['POST'])
def folders_name():
    request_data = request.get_json()
    if request_data["id"] == "0": abort(400, "Invalid operation") 
    with open(os.path.join(os.environ.get("DATA_PATH"), "chat_index.json"), 'r+') as f:
        
        file_data = json.load(f)
        file_data[request_data["id"]]["name"] = request_data['name']
        
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
        
        return 'Success'
    
    
def delete(data, item):
    if item != "0": # dont delete the root that will make problems
        if data[item]["type"] == "chat":
            os.remove(os.path.join(os.environ.get("DATA_PATH"), "chats", "{}.json".format(item)))
        elif data[item]["type"] == "file":
            os.remove(os.path.join(os.environ.get("DATA_PATH"), "files", data[item]["name"]))
        del data[item]
    
    for i in list(data.keys()):
        if data.get(i, dict()).get("location", None) == item:
            delete(data, i)
    

@app.route('/folders_delete', methods=['POST'])
def folders_delete():
    request_data = request.get_json()
    with open(os.path.join(os.environ.get("DATA_PATH"), "chat_index.json"), 'r+') as f:
        file_data = json.load(f)
        delete(file_data, request_data["id"])
                    
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
        
    return 'Success'

@app.route("/folders_move", methods=['POST'])
def folders_move():
    request_data = request.get_json()
    if request_data["id"] == "0": abort(400, "Invalid operation")
    with open(os.path.join(os.environ.get("DATA_PATH"), "chat_index.json"), 'r+') as f:
        
        file_data = json.load(f)
        
        file_data[request_data["id"]]["location"] = request_data["to_id"]
            
        f.seek(0)
        json.dump(file_data, f)
        f.truncate()
        
        return 'Success'



@app.route('/folders')
def folders():
    with open(os.path.join(os.environ.get("DATA_PATH"), "chat_index.json"), 'r') as f:
        data = json.load(f)
        
        return data


@app.route('/chat', methods=['POST'])
def chat():
    request_data = request.get_json()
    with open(os.path.join(os.environ.get("DATA_PATH"), "chats", "{}.json".format(request_data["id"])), 'r') as f:
        data = json.load(f)

    return data


def get_enviroment(chat_id):
    with open(os.path.join(os.environ.get("DATA_PATH"), "chat_index.json"), 'r') as f:
        file_data = json.load(f)
        
        enviroment = list()
        for i,j in file_data.items():
            if j.get("location", "_") == file_data[chat_id]["location"] and file_data[i]["type"] == "file":
                enviroment.append(file_data[i]["name"])
            
        return enviroment


@socketio.on("generate")
def generate(req):

    prompt = req["data"]
    if prompt.strip() == "":
        abort(400, "No data provided")
    chat = req["chat"]
    
    id1 = make_id()
    id2 = make_id()
    
    # print("promp:", prompt)
     
    with open(os.path.join(os.environ.get("DATA_PATH"), "chats", "{}.json".format(chat)), 'r+') as f:
        data = json.load(f)
        
        chatlog = list()
        for i in data["data"]:
            # print(i["content"])
            chatlog.append((i["user"], i["content"]))
                    
        t = int(time.time())
        data["last_updated"] = t
        data["data"].append({
                "id": id2,
                "user": "human",
                "log": [],
                "content": prompt,
                "time": t
            })
        
        data["data"].append({
                "id": id1,
                "user": "ai",
                "log": [],
                "content": "",
                "time": t
            })
                
        for chunk in agent_executor.stream({"input": prompt, "chat_history": chatlog, "enviroment":get_enviroment(chat)}):
                                    
            output = {
                "id1": id1,
                "id2": id2,
                "log": [x.content for x in chunk.get("messages", [])],
                "content":chunk.get("output", "")
            }
            
            data["data"][-1]["log"] += output["log"]
            data["data"][-1]["content"] += output["content"]
            
            emit('generate_res', {'data': output, 'lastPacket': False})
            
        f.seek(0)
        json.dump(data, f)
        f.truncate()
    
    # dodgy hack to end stream
    lastPacket = {
            "log":[],
            "content":""
        }
    emit('generate_res', {'data': lastPacket, 'lastPacket': True})
    

# this is debug only prod will host on port 80
if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=int(os.environ.get("PORT", 5000)), allow_unsafe_werkzeug=True)