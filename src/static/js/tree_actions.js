function move_tree(id, to_id) {
    $.ajax({
        url: '/folders_move',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            type: "chat",
            id: id,
            to_id: to_id
        }),
        success: function (response) {
            update_tree()
        },

        error: function (xhr, status, error) {
            // Handle any errors
            console.error(error);
        }
    })
}



function collapse_folder(item_id) {
    $.ajax({
        url: '/collapse_folder',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            type: "chat",
            id: item_id,
            name: name
        }),
        success: function (response) {
            update_tree()
        },

        error: function (xhr, status, error) {
            // Handle any errors
            console.error(error);
        }
    })
}
function expand_folder(item_id) {
    $.ajax({
        url: '/expand_folder',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            type: "chat",
            id: item_id,
            name: name
        }),
        success: function (response) {
            update_tree()
        },

        error: function (xhr, status, error) {
            // Handle any errors
            console.error(error);
        }
    })
}


function new_file(item_id) {
    get_input("New Chat", "Enter the name of the new Chat", function (name, event) {
        $.ajax({
            url: '/folders_add',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                type: "chat",
                id: item_id,
                name: name
            }),
            success: function (response) {
                update_tree()
            },

            error: function (xhr, status, error) {
                // Handle any errors
                console.error(error);
            }
        })
    })
}

function new_folder(item_id) {
    get_input("New Folder", "Enter the name of the new folder", function (name, event) {
        $.ajax({
            url: '/folders_add',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                type: "folder",
                id: item_id,
                name: name
            }),
            success: function (response) {
                update_tree()
            },

            error: function (xhr, status, error) {
                // Handle any errors
                console.error(error);
            }
        })
    })
}

function edit_name(item_id) {
    get_input(sidebar_data[item_id].name, "Enter the new name", function (name, event) {
        $.ajax({
            url: '/folders_name',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                id: item_id,
                name: name
            }),
            success: function (response) {
                update_tree()
            },

            error: function (xhr, status, error) {
                // Handle any errors
                console.error(error);
            }
        })
    })
}

function delete_tree(item_id) {
    $.ajax({
        url: '/folders_delete',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            id: item_id,
        }),
        success: function (response) {
            update_tree()
        },

        error: function (xhr, status, error) {
            // Handle any errors
            console.error(error);
        }
    })
}
