({
    updateDistance: function(c, h) {
        let speed = 0;
        switch(c.get("v.transportation")) {
            case "DRIVING":
                speed = c.get("v.drivingSpeed");
                break;
            case "TRAIN":
                speed = c.get("v.trainSpeed");
                break;
            case "WALKING":
                speed = c.get("v.walkingSpeed");
                break;
        }
        
        const time = c.get("v.time");
        c.set("v.distance", time && speed ? speed * time : null);
    }
})