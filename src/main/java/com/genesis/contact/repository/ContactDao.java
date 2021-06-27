package com.genesis.contact.repository;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;
import java.io.Serializable;

public abstract class ContactDao<T extends Serializable> {

    private Class<T> clazz;

    @PersistenceContext
    private EntityManager entityManager;

    public void setClazz(Class<T> clazzToSet) {
        this.clazz = clazzToSet;
    }

    public T get(long id) {
        return entityManager.find(clazz, id);
    }

    @Transactional
    public T update(T entity) {
        return entityManager.merge(entity);
    }

    @Transactional
    public T save(T entity) {
        entityManager.persist(entity);
        entityManager.flush();
        return entity;
    }

    @Transactional
    public void delete(T entity) {
        entityManager.remove(entity);
    }

    @Transactional
    public void deleteById(Long entityId) {
        T entity = get(entityId);
        delete(entity);
    }
}
