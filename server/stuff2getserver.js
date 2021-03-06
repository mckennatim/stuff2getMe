// Lists -- {name: String}
Lists = new Meteor.Collection("lists");
// Publish complete set of lists to all clients.
Meteor.publish('lists', function () {
  return Lists.find();
});


Users = new Meteor.Collection("users");


// Items -- {text: String,
//           done: Boolean,
//           tags: [String, ...],
//           list_id: String,
//           timestamp: Number}
Items = new Meteor.Collection("items");
// Publish all items for requested list_id.
Meteor.publish('items', function (list_id) {
  check(list_id, String);
  return Items.find({list_id: list_id});
});



