Lists = new Meteor.Collection("lists");
Users = new Meteor.Collection("users");
Items = new Meteor.Collection("items");

// ID of currently selected list
Session.setDefault('list_id', null);

// Name of currently selected tag for filtering
Session.setDefault('tag_filter', null);

// When adding tag to a todo, ID of the todo
Session.setDefault('editing_addtag', null);

// When editing a list name, ID of the list
Session.setDefault('editing_listname', null);

// When editing todo text, ID of the todo
Session.setDefault('editing_itemname', null);

// Subscribe to 'lists' collection on startup.
// Select a list once data has arrived.
var listsHandle = Meteor.subscribe('lists', function () {
  if (!Session.get('list_id')) {
    var list = Lists.findOne({}, {sort: {name: 1}});
    if (list)
      Router.setList(list._id);
  }
});

var itemsHandle = null;
// Always be subscribed to the items for the selected list.
Deps.autorun(function () {
  var list_id = Session.get('list_id');
  if (list_id)
    itemsHandle = Meteor.subscribe('items', list_id);
  else
    itemsHandle = null;
});

////////// Helpers for in-place editing //////////

// Returns an event map that handles the "escape" and "return" keys and
// "blur" events on a text input (given by selector) and interprets them
// as "ok" or "cancel".
var okCancelEvents = function (selector, callbacks) {
  var ok = callbacks.ok || function () {};
  var cancel = callbacks.cancel || function () {};

  var events = {};
  events['keyup '+selector+', keydown '+selector+', focusout '+selector] =
    function (evt) {
      if (evt.type === "keydown" && evt.which === 27) {
        // escape = cancel
        cancel.call(this, evt);

      } else if (evt.type === "keyup" && evt.which === 13 ||
                 evt.type === "focusout") {
        // blur/return/enter = ok/submit if non-empty
        var value = String(evt.target.value || "");
        if (value)
          ok.call(this, value, evt);
        else
          cancel.call(this, evt);
      }
    };

  return events;
};


var activateInput = function (input) {
  input.focus();
  input.select();
};


////////// Lists //////////

Template.lists.loading = function () {
  return !listsHandle.ready();
};

Template.lists.lists = function () {
  return Lists.find({}, {sort: {name: 1}});
};

////////// Items and nitems //////////

Template.items.loading = function () {
  return itemsHandle && !itemsHandle.ready();
};

Template.items.any_list_selected = function () {
  return !Session.equals('list_id', null);
};

Template.nitems.loading = function () {
  return itemsHandle && !itemsHandle.ready();
};

Template.nitems.any_list_selected = function () {
  return !Session.equals('list_id', null);
};

Template.items.events(okCancelEvents(
  '#new-item',
  {
    ok: function (text, evt) {
      var tag = Session.get('tag_filter');
      Items.insert({
        text: text,
        list_id: Session.get('list_id'),
        done: false,
        timestamp: (new Date()).getTime(),
        tags: tag ? [tag] : []
      });
      evt.target.value = '';
    }
  }));

Template.items.events = {
  'keypress input#new-item': function (evt){
    tval = String.fromCharCode(evt.which);
    console.log(tval);
  }
};


Template.items.items = function () {
  // Determine which items to display in main pane,
  // selected based on list_id and tag_filter.
  var list_id = Session.get('list_id');
  if (!list_id)
    return {};
  var sel = {list_id: list_id, done: false
  };
  var tag_filter = Session.get('tag_filter');
  if (tag_filter)
    sel.tags = tag_filter;
  return Items.find(sel, {sort: {timestamp: 1}});
};

Template.nitems.items = function () {
  // Determine which items to display in main pane,
  // selected based on list_id and tag_filter.
  var list_id = Session.get('list_id');
  if (!list_id)
    return {};
  var sel = {list_id: list_id, done: true};
  var tag_filter = Session.get('tag_filter');
  if (tag_filter)
    sel.tags = tag_filter;
  return Items.find(sel, {sort: {timestamp: 1}});
};

Template.item_item.tag_objs = function () {
  var item_id = this._id;
  return _.map(this.tags || [], function (tag) {
    return {item_id: item_id, tag: tag};
  });
};

Template.item_item.done_class = function () {
  return this.done ? 'done' : '';
};

Template.item_item.done_checkbox = function () {
  return this.done ? 'checked="checked"' : '';
};

Template.item_item.editing = function () {
  return Session.equals('editing_itemname', this._id);
};

Template.item_item.adding_tag = function () {
  return Session.equals('editing_addtag', this._id);
};


Template.item_item.events({
  'click .check': function () {
    Items.update(this._id, {$set: {done: !this.done}});
  },
  'click .destroy': function () {
    Items.remove(this._id);
  },
  'click .addtag': function (evt, tmpl) {
    Session.set('editing_addtag', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#edittag-input"));
  },
  'dblclick .display .todo-text': function (evt, tmpl) {
    Session.set('editing_itemname', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#todo-input"));
  },
  'click .remove': function (evt) {
    var tag = this.tag;
    var id = this.item_id;
    evt.target.parentNode.style.opacity = 0;
    // wait for CSS animation to finish
    Meteor.setTimeout(function () {
      Items.update({_id: id}, {$pull: {tags: tag}});
    }, 300);
  }
});

Template.item_item.events(okCancelEvents(
  '#item-input',
  {
    ok: function (value) {
      Items.update(this._id, {$set: {text: value}});
      Session.set('editing_itemname', null);
    },
    cancel: function () {
      Session.set('editing_itemname', null);
    }
  }));

Template.item_item.events(okCancelEvents(
  '#edittag-input',
  {
    ok: function (value) {
      Items.update(this._id, {$addToSet: {tags: value}});
      Session.set('editing_addtag', null);
    },
    cancel: function () {
      Session.set('editing_addtag', null);
    }
  }));

////////// Tracking selected list in URL //////////

var ItemsRouter = Backbone.Router.extend({
  routes: {
    ":list_id": "main"
  },
  main: function (list_id) {
    var oldList = Session.get("list_id");
    if (oldList !== list_id) {
      Session.set("list_id", list_id);
      Session.set("tag_filter", null);
    }
  },
  setList: function (list_id) {
    this.navigate(list_id, true);
  }
});

Router = new ItemsRouter;

Meteor.startup(function () {
  Backbone.history.start({pushState: true});
});