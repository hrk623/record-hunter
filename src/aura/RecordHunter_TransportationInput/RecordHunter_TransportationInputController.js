({
    onInit: function(c, e, h) {
        window.addEventListener('click', $A.getCallback(function (event) {
            c.set("v.isMenuOpen", false);
        }));
        
        h.updateDistance(c, h);
    },
    onTransportaionClicked: function(c, e, h) {
         e.stopPropagation();
        c.set("v.isMenuOpen", true);
    },
    onTransportationSelected: function(c, e, h) {
        e.stopPropagation();
        const handlerNode = e.currentTarget; 
        const transportation = handlerNode.dataset.transportation;

        c.set("v.transportation", transportation);
        c.set("v.isMenuOpen", false);
        h.updateDistance(c, h);
    },
    onTimeChanged: function(c, e, h) {
       h.updateDistance(c, h);
    },
})