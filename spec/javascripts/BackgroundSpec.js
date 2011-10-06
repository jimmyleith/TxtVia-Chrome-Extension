describe("Background", function () {
    it("should initialise background script", function () {
        spyOn(chrome.app, 'getDetails').andCallFake(function(){
            return {
                version:'1.2.0'
            };
        });
        spyOn(TxtVia, 'init').andCallThrough();
        spyOn(Background, 'Update').andCallThrough();
        spyOn(Background, 'onAuthenticated').andCallThrough();
        spyOn(Background.notify, 'icon').andCallThrough();
        
        // chrome.app.getDetails().stub('version').and_return('1.2.0');
        Background.init();
        expect(TxtVia.init).toHaveBeenCalled();
        expect(Background.Update).toHaveBeenCalled();
        expect(Background.onAuthenticated).toHaveBeenCalled();
        expect(Background.notify.icon).toHaveBeenCalled();
    });
});
