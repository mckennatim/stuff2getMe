// if the database is empty on server start, create some sample data.
Meteor.startup(function () {
  if (Lists.find().count() === 0) {
    var data = [
      {name: "Building",
       contents: [
         ["3/8 nut driver"],
         ["cleats"]
       ]
      },
      {name: "Drugs",
       contents: [
         ["baby aspirin"],
         ["suntan lotion"]
        ]
      },
      {name: "Groceries",
        contents: [
          ["bananas"],
          ["oranges"],
          ["coffee"]
        ]
      }
    ];

    var timestamp = (new Date()).getTime();
    for (var i = 0; i < data.length; i++) {
      var list_id = Lists.insert({name: data[i].name});
      for (var j = 0; j < data[i].contents.length; j++) {
        var info = data[i].contents[j];
        Items.insert({list_id: list_id,
                      text: info[0],
                      done: false,
                      timestamp: timestamp,
                      tags: info.slice(1)});
                      timestamp += 1; // ensure unique timestamp.
      }
    }
  }
});
