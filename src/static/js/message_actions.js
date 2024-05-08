function toast(message) {

}


function m_toggle_md(id) {
    $message = $("#" + id);

    $message.find(".message-body").find(".md-render").children().toggleClass("hidden")

}



function m_copy(id) {
    $message = $("#" + id);

    const message_string = $message.find(".message-body").find(".md-render").children().first().text()

    navigator.clipboard.writeText(message_string);

    toast("Copied")

}


function m_author(id, author) {
    $.ajax({
        url: '/message_author',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            chat_id: localStorage.getItem("active"),
            message_id: id,
            author: author
        }),
        success: function (response) {
            current = $("#" + localStorage.getItem("active"));
            current.addClass("active")
            current[0].dispatchEvent(new Event('loadchat', { bubbles: true }))
        },

        error: function (xhr, status, error) {
            // Handle any errors
            console.error(error);
        }
    })

}


function m_edit(id) {
    $message = $("#" + id);

    const message_string = $message.find(".message-body").find(".md-render").children().first().text()

    get_input(message_string, "Edit prompt", function (new_message, event) {

        $.ajax({
            url: '/message_edit',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                chat_id: localStorage.getItem("active"),
                message_id: id,
                content: new_message
            }),
            success: function (response) {
                current = $("#" + localStorage.getItem("active"));
                current.addClass("active")
                current[0].dispatchEvent(new Event('loadchat', { bubbles: true }))
            },

            error: function (xhr, status, error) {
                // Handle any errors
                console.error(error);
            }
        })


    })

}



function m_delete(id) {
    $message = $("#" + id);
    console.log($message)

    $.ajax({
        url: '/message_delete',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            chat_id: localStorage.getItem("active"),
            message_id: id,
        }),
        success: function (response) {
            $message.remove()
        },

        error: function (xhr, status, error) {
            // Handle any errors
            console.error(error);
        }
    })
}

function m_new(id) {
    $message = $("#" + id);

    get_input("", "New message", function (new_message, event) {

        $.ajax({
            url: '/message_new',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                chat_id: localStorage.getItem("active"),
                message_id: id,
                content: new_message
            }),
            success: function (response) {
                current = $("#" + localStorage.getItem("active"));
                current.addClass("active")
                current[0].dispatchEvent(new Event('loadchat', { bubbles: true }))
            },

            error: function (xhr, status, error) {
                // Handle any errors
                console.error(error);
            }
        })


    })
}