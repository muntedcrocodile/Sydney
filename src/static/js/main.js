Handlebars.registerHelper('isEqualTo', function (value1, value2) {
    return value1 === value2;
});




const input = $("#input")

function render() {
    $('#input-render').text(input.val());

    // Get the position of the cursor in the input
    const cursorPosition = input[0].selectionStart;
    const inputValue = input.val();
    // Insert the blinking cursor at that position in the text content
    const renderedText = inputValue.slice(0, cursorPosition) + "<span id='blinker'>|</span>" + inputValue.slice(cursorPosition);
    $('#input-render').text(renderedText);
}

// Event listener for when keyboard input occurs
input.on('input', render);
input.on('click', render);
input.on('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
        document.dispatchEvent(new Event('confirminput'));
    } else {
        setTimeout(render, 1);
    }
});


const md = markdownit({ html: true })
    .use(texmath, {
        engine: katex,
        delimiters: 'dollars',
        katexOptions: { macros: { "\\RR": "\\mathbb{R}" } }
    });

// md rendering
var parentDivs = $('.md-render');


dorender = function () {
    var hiddenChild = $(this).find('div:first-child');
    var showdownRendered = $(this).find('.showdown-rendered');

    var _dorender = function () {
        showdownRendered[0].innerHTML = md.render(hiddenChild[0].textContent);

        const tmp = console.log;
        console.log = function () { };
        hljs.highlightAll();
        console.log = tmp;
    }

    var observer = new MutationObserver(_dorender);

    observer.observe(hiddenChild[0], { childList: true, subtree: true });
    _dorender()
}


parentDivs.each(dorender);

render();

// click ktext to copy
document.addEventListener('click', function (event) {
    const targetElement = event.target;

    if (targetElement.classList.contains('katex') || targetElement.closest('.katex')) {
        const element = targetElement.closest('.katex') || targetElement; // Get the closest parent with the class 'katex'
        handleElementClick(element);
    }
});

function handleElementClick(element) {
    const latex_data = element.childNodes[0].childNodes[0].childNodes[0].childNodes[1].innerHTML;

    navigator.clipboard.writeText(latex_data)
        .then(() => {
            console.log('String copied to clipboard: ' + latex_data);
            // You can display a success message or perform other actions here
        })
        .catch(err => {
            console.error('Unable to copy the string: ', err);
            // Handle any errors that occur during the copy process
        });

    console.log('Element clicked:', element);
    // You can perform any action based on the clicked element here
}

function compileHandlebarsTemplate(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    const templateContent = xhr.responseText;
                    const compiledTemplate = Handlebars.compile(templateContent);
                    resolve(compiledTemplate);
                } else {
                    reject(new Error(`Failed to fetch template. Status: ${xhr.status}`));
                }
            }
        };
        xhr.send();
    });
}

// data orientated chat
// Define a list of data structures
// var messages = [{ image: "pfp", thought: "Thought 4", content: "Content 4" }, { image: "pfp", thought: "Thought 4", content: "Content 4" }];
var messages = []

// messages.push({ image: "pfp", thought: "Thought 4", content: "Content 4" });


const container = $("#message-container");



document.addEventListener("loadchat", (event) => {
    const current = $(event.target).closest(".drag_item");
    $.ajax({
        url: '/chat',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            id: current.attr("id"),
        }),
        success: function (response) {
            messages = response.data.map(item => ({
                id: item.id,
                image: { human: "pfp", ai: "gpt", system: "sys" }[item.user],
                thought: format_chat(item.log),
                content: item.content,
                time: item.time
            }));
            document.dispatchEvent(new Event('updateEvent')); // put the messages in the html
            get_input("", "Ask Sydney anything", function (message, event) {
                send(message)
            })
        },

        error: function (xhr, status, error) {
            // Handle any errors
            console.error(error);
        }
    })
});


compileHandlebarsTemplate('static/templates/message.template.handlebars')
    .then(template => {

        // Function to create and update HTML for each struct
        function updateHTML() {
            container[0].innerHTML = template({ messages });

            container.find(".md-render").each(dorender);

            container.find(".message-header").click(function () {
                $(this).toggleClass('collapsed');
            });

            $(".chat")[0].scrollTop = $(".chat")[0].scrollHeight;

            $(".profile-picture").find("select").change((event) => {
                m_author($(event.target).closest(".message").attr("id"), $(event.target).val())
            })

        }

        // Update the HTML with the initial data structures
        updateHTML();
        document.addEventListener('updateEvent', updateHTML);
    })
    .catch(error => {
        console.error(error);
    });



// is only a function to ensure consistency
function format_chat(log) {
    return log.join('\n').trim();
}


function send(val) {
    messages.push({ id: "WAITING", image: "pfp", thought: "", content: val });
    messages.push({ id: "WAITING", image: "gpt", thought: "", content: "" });
    document.dispatchEvent(new Event('updateEvent')); // put message sin html


    // send to server

    const socket = io.connect(window.location.href)

    // Send data to the server
    socket.emit('generate', { data: val, chat: localStorage.getItem("active") });


    // Receive multiple responses from the server
    socket.on('generate_res', function (dataPacket) {
        if ("log" in dataPacket.data && "content" in dataPacket.data) { // why is this line required?
            const content = dataPacket.data.content;

            // Insert the streamed data into the specified element
            messages[messages.length - 1].thought += format_chat(dataPacket.data.log);
            messages[messages.length - 1].content += content;

            if (dataPacket.data.id2 && dataPacket.data.id1) {
                messages[messages.length - 2].id = dataPacket.data.id2
                messages[messages.length - 1].id = dataPacket.data.id1
            }

            $(".message-header").addClass('collapsed');

            container.children().last().find(".message-header").text(messages[messages.length - 1].thought).removeClass('collapsed');


            container.children().last().find(".md-render").children().first()[0].textContent = messages[messages.length - 1].content;

        } else {
            console.error("Response does not contain all required keys.");
        }

        // log the raw packet
        // console.log('Received data packet:', dataPacket);

        // Close the WebSocket connection after receiving all packets
        if (dataPacket.lastPacket) {
            socket.disconnect();
            get_input("", "Ask Sydney anything", function (message, event) {
                send(message)
            })
        }
    });

}



function file_sort($element) {
    $element.children().sort(function (a, b) {
        var $a = $(a), $b = $(b);
        if ($a.is('div')) {
            return -1; // Divs come before other elements
        } else if ($a.hasClass('folders') && $b.hasClass('files')) {
            return -1; // Folders come before files
        } else {
            return 1; // Sort other elements in default order
        }
    }).appendTo($element);
}


// Handle folders
sidebar = $(".sidebar")
sidebar[0].innerHTML = ""
var sidebar_data;

function render_tree(_data, folder_template, chat_template, file_template) {

    data = JSON.parse(JSON.stringify(_data)) // we are operating on a copy cos we will anilate this object
    sidebar.html("")

    while (Object.keys(data).length > 0) {
        // Iterate over each item in the data object
        Object.keys(data).forEach(function (key) {
            var item = data[key];
            item.id = key

            // skip if we alread handled this
            if (sidebar.find('#' + key).length > 0) { return; }


            // Check if the item's id is "0"
            if (key === "0") {
                sidebar[0].innerHTML = folder_template(item);
                delete data[key]
            }

            // does this items parent exist in the tree
            if (sidebar.find('#' + item.location).length > 0) {

                if (item.type === "folder") {
                    sidebar.find('#' + item.location)[0].innerHTML += folder_template(item);
                    delete data[key]
                } else {
                    // check if a folder still exists in data and skip rendering this chat
                    if (!Object.values(data).some(jtem => jtem.type === "folder")) {
                        if (item.type === "file") {
                            sidebar.find('#' + item.location)[0].innerHTML += file_template(item);
                        } else {
                            sidebar.find('#' + item.location)[0].innerHTML += chat_template(item);
                        }
                        delete data[key]
                    }
                }

            }
        });

    }

    var drag_start;

    $(".drag_item").on('dragstart', (event) => {
        start = $(event.target).closest('.drag_item');
        drag_start = start;
        // event.preventDefault();
    })

    $(".drag_item").on('dragover', function (event) {
        event.preventDefault();
    });

    $(".folder").on('dragover', function (event) {
        event.dataTransfer = event.originalEvent.dataTransfer;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.types.includes("Files")) {
            $($(this).children()[0]).css("background-color", "#007e00");
        }
    });

    $(".folder").on('dragleave', function (event) {
        event.dataTransfer = event.originalEvent.dataTransfer;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.types.includes("Files")) {
            $($(this).children()[0]).css("background-color", "");
        }
    });

    $(".folder").on('drop', function (event) {
        event.dataTransfer = event.originalEvent.dataTransfer;
        event.preventDefault();
        event.stopPropagation();
        end = $(event.target).closest(".drag_item.folder");


        if (event.dataTransfer.types.includes("Files")) {
            $($(this).children()[0]).css("background-color", "");
            var form_data = new FormData();
            form_data.append('location', end.attr("id"));

            $.each(event.dataTransfer.files, function (index, file) {
                form_data.append(file.name, file);
            });

            $.ajax({
                url: '/file_upload',
                type: 'POST',
                data: form_data,
                processData: false,
                contentType: false,
                success: function (response) {
                    console.log(response);
                    update_tree();
                },
                error: function (xhr, status, error) {
                    // Handle the error
                }
            });
        }
    });

    $(".drag_item").filter(".folder").on('drop', (event) => {
        event.preventDefault();
        event.stopPropagation();
        end = $(event.target).closest(".drag_item.folder");

        if (end.closest(drag_start).length > 0) {
            console.warn("Paradoxes don't make good file structures")
            return;
        }

        if (!drag_start) {return;}

        drag_start.parent().appendTo(end)

        file_sort(end)

        move_tree(drag_start.attr("id"), end.attr("id"))


    })

    $(".drag_item").on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if ($(event.target).closest("button").length > 0) {
            return;
        }
        current = $(event.target).closest(".drag_item")
        if (current.hasClass("file") && current.hasClass("active") === false) {
            lastactive = $("#" + localStorage.getItem("active"));
            lastactive.removeClass("active")
            current.addClass("active")
            current[0].dispatchEvent(new Event('loadchat', { bubbles: true })) // jquery trigger didnt work here idk why
            localStorage.setItem("active", current.attr("id"));
        }
    })

    $(".foldername").on('click', function() {
        $(this).parent().children().first().click()
    })


    current = $("#" + localStorage.getItem("active"));
    current.addClass("active")
    if (current[0]) {
        current[0].dispatchEvent(new Event('loadchat', { bubbles: true })) // jquery trigger didnt work here idk why
    }

}

var folder_template, chat_template, file_template;

compileHandlebarsTemplate('static/templates/folder.template.handlebars').then(template => {
    folder_template = template;
    compileHandlebarsTemplate('static/templates/chat.template.handlebars').then(template => {
        chat_template = template;
        compileHandlebarsTemplate('static/templates/file.template.handlebars').then(template => {
            file_template = template;
            update_tree()
        });
    });
});



function update_tree() {
    $.ajax({
        url: '/folders',
        method: 'GET',
        success: function (response) {
            sidebar_data = response;
            render_tree(response, folder_template, chat_template, file_template);
        },
        error: function (xhr, status, error) {
            console.error(error);
        }
    });
}


var callback;
function get_input(default_value, prompt, callback1) {
    input.val(default_value)
    input.click() // this event triggers rerender
    $("#input-prompt").text(prompt)
    callback = callback1
    input.parent().removeClass("hidden")
    input.focus()
}

document.addEventListener("confirminput", (event) => {
    callback(input.val(), event)
    input.val("")
    input.click()
    $("#input-prompt").text("")
    input.parent().addClass("hidden")
})