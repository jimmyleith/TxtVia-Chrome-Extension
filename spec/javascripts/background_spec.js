describe("Background", function () {
    describe("init",function(){
       it("should be defined",function(){
           expect(Background.init).toBeDefined();
       }); 
    });
    it("should initialise background script", function () {
        spyOn(TxtVia, 'init').andCallThrough();
        spyOn(Background, 'Update').andCallThrough();
        spyOn(Background, 'onAuthenticated').andCallThrough();
        spyOn(Background.notify, 'icon').andCallThrough();
        
        Background.init();
        
        expect(TxtVia.init).toHaveBeenCalled();
        expect(Background.Update).toHaveBeenCalled();
        expect(Background.onAuthenticated).toHaveBeenCalled();
        expect(Background.notify.icon).toHaveBeenCalled();
    });
});
