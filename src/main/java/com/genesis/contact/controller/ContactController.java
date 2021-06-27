package com.genesis.contact.controller;

import com.genesis.contact.model.Contact;
import com.genesis.contact.service.ContactService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/contact")
public class ContactController {

    private ContactService contactService;

    @Autowired
    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @GetMapping("/contact")
    public ResponseEntity<Contact> getContactById(
            @RequestParam Long contactId
    ) {
        try {
            var contact = contactService.getContact(contactId);

            return new ResponseEntity<>(contact, contact != null ? HttpStatus.OK : HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/contact")
    public ResponseEntity<Contact> createContract(
            @RequestBody Contact newContact
    ) {
        try {
            var contractSaved = contactService.saveContact(newContact);
            return new ResponseEntity<>(contractSaved, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/contact")
    public ResponseEntity<Boolean> deleteContact(
            @RequestParam Long contactId
    ) {
        try {
            var deleted = contactService.deleteContact(contactId);
            return new ResponseEntity<>(deleted, deleted ? HttpStatus.OK : HttpStatus.NOT_FOUND);

        } catch (Exception e) {
            return new ResponseEntity<>(false, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/contact")
    public ResponseEntity<Contact> updateContact(
            @RequestBody Contact contactToUpdate
    ) {
        try {
            var contactUpdated = contactService.updateContact(contactToUpdate);
            return new ResponseEntity<>(contactUpdated, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
